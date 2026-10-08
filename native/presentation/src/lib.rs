#![allow(dead_code)]
mod native_surface;
mod windows_d3d11;
mod windows_dpi;
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi::{Error, Status};
use napi_derive::napi;
use once_cell::sync::Lazy;
type FatalThreadsafeFunction<T> = ThreadsafeFunction<T, (), T, Status, false>;
type JsCallback<'scope, T> = Function<'scope, T, ()>;

#[cfg(target_os = "windows")]
// Electron 43's offscreen GPU path uses a finite ten-frame producer pool. Keep
// only a double-buffered pair alive in Steam Bridge so a slow cross-device copy
// cannot retain most of Chromium's reusable frames or build a deep D3D queue.
// Newer paint events are rejected before native submission and their Electron
// textures are released by the caller immediately.
const NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_LIMIT: usize = 2;

#[cfg(target_os = "windows")]
static NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_COUNT: std::sync::atomic::AtomicUsize =
    std::sync::atomic::AtomicUsize::new(0);

#[cfg(target_os = "windows")]
static NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_MAX: std::sync::atomic::AtomicUsize =
    std::sync::atomic::AtomicUsize::new(0);

#[cfg(target_os = "windows")]
static NATIVE_OVERLAY_SHARED_TEXTURE_COPY_SATURATION_DROP_COUNT: std::sync::atomic::AtomicU64 =
    std::sync::atomic::AtomicU64::new(0);

#[cfg(target_os = "windows")]
struct NativeOverlaySharedTextureCopyPermit;

#[cfg(target_os = "windows")]
impl Drop for NativeOverlaySharedTextureCopyPermit {
    fn drop(&mut self) {
        NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_COUNT
            .fetch_sub(1, std::sync::atomic::Ordering::AcqRel);
    }
}

#[cfg(target_os = "windows")]
fn try_reserve_native_overlay_shared_texture_copy_job(
) -> Option<NativeOverlaySharedTextureCopyPermit> {
    let prior = NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_COUNT
        .fetch_update(
            std::sync::atomic::Ordering::AcqRel,
            std::sync::atomic::Ordering::Acquire,
            |count| (count < NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_LIMIT).then_some(count + 1),
        )
        .ok()?;
    NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_MAX
        .fetch_max(prior + 1, std::sync::atomic::Ordering::Relaxed);
    Some(NativeOverlaySharedTextureCopyPermit)
}

#[cfg(target_os = "windows")]
pub(crate) fn native_overlay_shared_texture_copy_job_count() -> usize {
    NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_COUNT.load(std::sync::atomic::Ordering::Acquire)
}

#[cfg(target_os = "windows")]
pub(crate) fn native_overlay_shared_texture_copy_job_limit() -> usize {
    NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_LIMIT
}

#[cfg(target_os = "windows")]
pub(crate) fn native_overlay_shared_texture_copy_job_max() -> usize {
    NATIVE_OVERLAY_SHARED_TEXTURE_COPY_JOB_MAX.load(std::sync::atomic::Ordering::Relaxed)
}

#[cfg(target_os = "windows")]
pub(crate) fn native_overlay_shared_texture_copy_saturation_drop_count() -> u64 {
    NATIVE_OVERLAY_SHARED_TEXTURE_COPY_SATURATION_DROP_COUNT
        .load(std::sync::atomic::Ordering::Relaxed)
}

#[cfg(target_os = "windows")]
struct NativeOverlaySharedTextureCopyJob {
    request: native_surface::SharedTextureUpdateRequest,
    completion: FatalThreadsafeFunction<serde_json::Value>,
    _permit: NativeOverlaySharedTextureCopyPermit,
}

#[cfg(target_os = "windows")]
fn complete_native_overlay_shared_texture_copy(job: NativeOverlaySharedTextureCopyJob) {
    // The JavaScript callback releases Electron's finite producer texture. D3D
    // submission and Flush are asynchronous, so acknowledge only after the
    // fence or legacy event query proves that the bridge-owned copy no longer
    // reads that producer.
    let result = match job.request.wait() {
        Ok(true) => serde_json::json!({
            "accepted": true,
            "producerReleaseSafe": true,
        }),
        Ok(false) => serde_json::json!({
            "accepted": false,
            "producerReleaseSafe": true,
        }),
        Err(error) => serde_json::json!({
            "error": error,
            "producerReleaseSafe": false,
        }),
    };
    job.completion
        .call(result, ThreadsafeFunctionCallMode::NonBlocking);
}

#[cfg(target_os = "windows")]
static NATIVE_OVERLAY_SHARED_TEXTURE_COPY_DISPATCHER: Lazy<
    std::result::Result<std::sync::mpsc::Sender<NativeOverlaySharedTextureCopyJob>, String>,
> = Lazy::new(|| {
    let (sender, receiver) = std::sync::mpsc::channel();
    std::thread::Builder::new()
        .name("steam-bridge-d3d11-copy".to_owned())
        .spawn(move || {
            while let Ok(job) = receiver.recv() {
                complete_native_overlay_shared_texture_copy(job);
            }
        })
        .map(|_| sender)
        .map_err(|error| format!("Failed to start the D3D11 copy completion dispatcher: {error}"))
});

#[napi(js_name = "beginNativeOverlayHostSharedTextureCopy")]
pub fn begin_native_overlay_host_shared_texture_copy(
    handle: Buffer,
    width: u32,
    height: u32,
    content_x: Option<u32>,
    content_y: Option<u32>,
    content_width: Option<u32>,
    content_height: Option<u32>,
    presentation_x: Option<u32>,
    presentation_y: Option<u32>,
    presentation_width: Option<u32>,
    presentation_height: Option<u32>,
    #[napi(ts_arg_type = "(result: any) => void")] completion: JsCallback<'_, serde_json::Value>,
) -> std::result::Result<bool, Error> {
    #[cfg(target_os = "windows")]
    {
        let dispatcher = NATIVE_OVERLAY_SHARED_TEXTURE_COPY_DISPATCHER
            .as_ref()
            .map_err(|error| Error::from_reason(error.clone()))?
            .clone();
        let Some(permit) = try_reserve_native_overlay_shared_texture_copy_job() else {
            NATIVE_OVERLAY_SHARED_TEXTURE_COPY_SATURATION_DROP_COUNT
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            return Ok(false);
        };
        let threadsafe_completion: FatalThreadsafeFunction<serde_json::Value> = completion
            .build_threadsafe_function::<serde_json::Value>()
            .build_callback(|ctx| Ok(ctx.value))?;
        let request = native_surface::begin_shared_texture_update(
            handle,
            width,
            height,
            content_x,
            content_y,
            content_width,
            content_height,
            presentation_x,
            presentation_y,
            presentation_width,
            presentation_height,
        )?;
        if !request.is_accepted() {
            return Ok(false);
        }
        let job = NativeOverlaySharedTextureCopyJob {
            request,
            completion: threadsafe_completion,
            _permit: permit,
        };
        if let Err(error) = dispatcher.send(job) {
            // The process-wide dispatcher has no ordinary shutdown path. If it
            // dies unexpectedly, preserve the producer lifetime contract by
            // completing this one GPU wait before returning its callback.
            complete_native_overlay_shared_texture_copy(error.0);
        }
        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (
            handle,
            width,
            height,
            content_x,
            content_y,
            content_width,
            content_height,
            presentation_x,
            presentation_y,
            presentation_width,
            presentation_height,
            completion,
        );
        Err(Error::from_reason(
            "Asynchronous Electron shared textures are supported only by the Windows D3D11 native host",
        ))
    }
}

#[napi(js_name = "waitForNativeOverlayHostFrameReady")]
pub async fn wait_for_native_overlay_host_frame_ready(
    timeout_ms: Option<u32>,
) -> std::result::Result<bool, Error> {
    #[cfg(target_os = "windows")]
    {
        let Some(request) = native_surface::begin_frame_latency_wait()? else {
            return Ok(false);
        };
        let wait_token = request.token();
        if timeout_ms == Some(0) {
            native_surface::bypass_frame_latency_wait(wait_token);
            return Ok(false);
        }
        let timeout_ms = timeout_ms.unwrap_or(100).clamp(1, 1_000);
        let ready_token = tokio::task::spawn_blocking(move || request.wait(timeout_ms))
            .await
            .map_err(|error| {
                Error::from_reason(format!("DXGI frame latency worker failed: {error}"))
            })?
            .map_err(Error::from_reason)?;
        Ok(match ready_token {
            Some(token) => native_surface::grant_frame_latency_ready(token),
            // Focus/resize can consume a waitable-object signal while the worker
            // is waiting. A timeout is not a device failure: retry next pump.
            // Permanently switching to unpaced Present(0) here starves producer
            // completion callbacks and repeats old frames after Alt+Tab.
            None => false
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = timeout_ms;
        Ok(false)
    }
}

#[napi] pub fn open(title: String, width: u32, height: u32) -> Result<()> {
    native_surface::open(Some(title), Some(width), Some(height), Some(960), Some(540))
}
#[napi] pub fn pump() -> Result<()> { native_surface::pump() }
#[napi] pub fn show() -> Result<()> { native_surface::show() }
#[napi] pub fn close() { native_surface::close() }
#[napi] pub fn is_open() -> bool { native_surface::is_probe_open() }
#[napi] pub fn bounds(x: i32,y: i32,w: u32,h: u32) -> Result<()> { native_surface::set_bounds(x,y,w,h) }
#[napi] pub fn fullscreen(value: bool) -> Result<()> { native_surface::set_full_screen(value) }
#[napi] pub fn cursor_hidden(value: bool) -> Result<()> { native_surface::set_cursor_hidden(value) }
#[napi] pub fn overlay_active(value: bool) -> Result<()> { native_surface::set_overlay_active(value) }
#[napi] pub fn continuous(value: bool,hz: f64) -> Result<()> { native_surface::set_continuous_present(value,Some(hz)) }
#[napi] pub fn events() -> String { native_surface::drain_input_events_json() }
#[napi] pub fn diagnostics() -> Option<String> { native_surface::host_diagnostics_json() }
#[napi] pub fn frame_pending() -> bool { native_surface::frame_pending() }
