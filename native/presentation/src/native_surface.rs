#![allow(unexpected_cfgs)]

use napi::bindgen_prelude::{Buffer, Error};

fn checked_native_overlay_frame_byte_len(
    width: u32,
    height: u32,
    platform: &str,
) -> Result<usize, Error> {
    if width == 0 || height == 0 || width > i32::MAX as u32 || height > i32::MAX as u32 {
        return Err(Error::from_reason(format!(
            "{platform} native overlay frame dimensions must be non-zero signed 32-bit values"
        )));
    }
    (width as usize)
        .checked_mul(height as usize)
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or_else(|| {
            Error::from_reason(format!(
                "{platform} native overlay frame dimensions overflow"
            ))
        })
}

#[cfg(target_os = "windows")]
mod windows {
    use super::{checked_native_overlay_frame_byte_len, Buffer, Error};
    use crate::windows_d3d11::{
        self, FrameLatencyWaitHandle, SharedTextureCopyWaitHandle, SharedTextureImportSubmission,
        WindowsD3d11Renderer,
    };
    use crate::windows_dpi::{
        adjust_window_rect_ex_for_dpi, dpi_for_system, dpi_for_window,
        restore_thread_dpi_awareness, set_thread_per_monitor_v2, system_metrics_for_dpi,
        system_parameters_info_for_dpi, window_is_per_monitor_v2, DPI_AWARENESS_CONTEXT,
    };
    use once_cell::sync::Lazy;
    use serde::{Deserialize, Serialize};
    use serde_json::json;
    use std::collections::HashMap;
    use std::env;
    use std::mem;
    use std::ptr;
    use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    pub fn ensure_main_thread() -> Result<(), Error> {
        Ok(())
    }
    use windows_sys::Win32::Foundation::{
        CloseHandle, GetLastError, SetLastError, HWND, LPARAM, LRESULT, POINT, RECT, SIZE, WPARAM,
    };
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_TRANSITIONS_FORCEDISABLED, DWMWA_WINDOW_CORNER_PREFERENCE,
        DWMWCP_DONOTROUND, DWMWCP_ROUND,
    };
    use windows_sys::Win32::Graphics::Gdi::{
        BeginPaint, ClientToScreen, CreateFontIndirectW, DeleteObject, DrawFrameControl, DrawTextW,
        EndPaint, EnumDisplaySettingsW, FillRect, GetDC, GetMonitorInfoW, GetStockObject,
        GetSysColor, GetSysColorBrush, GetTextExtentPoint32W, MonitorFromRect, MonitorFromWindow,
        ReleaseDC, ScreenToClient, SelectObject, SetBkMode, SetTextColor, COLOR_GRAYTEXT,
        COLOR_HIGHLIGHT, COLOR_HIGHLIGHTTEXT, COLOR_MENU, COLOR_MENUBAR, COLOR_MENUTEXT,
        DEFAULT_GUI_FONT, DEVMODEW, DFCS_INACTIVE, DFCS_MENUARROW, DFC_MENU, DT_HIDEPREFIX,
        DT_LEFT, DT_RIGHT, DT_SINGLELINE, DT_VCENTER, ENUM_CURRENT_SETTINGS, HDC, MONITORINFO,
        MONITORINFOEXW, MONITOR_DEFAULTTONEAREST, PAINTSTRUCT, TRANSPARENT,
    };
    use windows_sys::Win32::Graphics::OpenGL::{
        ChoosePixelFormat, SetPixelFormat, SwapBuffers, PFD_DOUBLEBUFFER, PFD_DRAW_TO_WINDOW,
        PFD_MAIN_PLANE, PFD_SUPPORT_OPENGL, PFD_TYPE_RGBA, PIXELFORMATDESCRIPTOR,
    };
    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows_sys::Win32::UI::Accessibility::{MSAAMENUINFO, MSAA_MENU_SIG};
    use windows_sys::Win32::UI::Controls::{
        DRAWITEMSTRUCT, MEASUREITEMSTRUCT, ODS_DISABLED, ODS_GRAYED, ODS_NOACCEL, ODS_SELECTED,
        ODT_MENU,
    };
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        ActivateKeyboardLayout, GetAsyncKeyState, GetCapture, GetKeyState, GetKeyboardLayout,
        ReleaseCapture, SetActiveWindow, SetCapture, SetFocus, VK_LBUTTON, VK_RBUTTON,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        AppendMenuW, CreateCursor, CreateMenu, CreatePopupMenu, CreateWindowExW, DefWindowProcW,
        DestroyCursor, DestroyMenu, DestroyWindow, DispatchMessageW, DrawMenuBar, EnumWindows,
        GetClassNameW, GetClientRect, GetCursorPos, GetForegroundWindow, GetMenu, GetMenuBarInfo,
        GetSystemMetrics, GetWindow, GetWindowLongPtrW, GetWindowPlacement, GetWindowRect,
        GetWindowTextW, GetWindowThreadProcessId, InsertMenuItemW, IsIconic, IsWindow,
        IsWindowVisible, IsZoomed, KillTimer, LoadCursorW, PeekMessageW, RegisterClassW,
        SendMessageW, SetCursor, SetForegroundWindow, SetLayeredWindowAttributes, SetMenu,
        SetTimer, SetWindowLongPtrW, SetWindowPlacement, SetWindowPos, ShowCursor, ShowWindow,
        SystemParametersInfoW, TranslateMessage, CS_OWNDC, GWLP_HWNDPARENT, GWL_EXSTYLE, GWL_STYLE,
        GW_OWNER, HCURSOR, HMENU, IDC_ARROW, LWA_ALPHA, MA_NOACTIVATE, MENUBARINFO, MENUITEMINFOW,
        MFS_DISABLED, MFS_ENABLED, MFT_OWNERDRAW, MFT_SEPARATOR, MF_GRAYED, MF_POPUP, MF_SEPARATOR,
        MF_STRING, MIIM_DATA, MIIM_FTYPE, MIIM_ID, MIIM_STATE, MIIM_STRING, MIIM_SUBMENU,
        MINMAXINFO, MSG, NONCLIENTMETRICSW, OBJID_MENU, PM_REMOVE, SIZE_MINIMIZED, SM_CXMENUCHECK,
        SM_CXMENUSIZE, SM_CXSCREEN, SM_CYMENU, SM_CYMENUSIZE, SM_CYSCREEN, SM_SWAPBUTTON,
        SPI_GETNONCLIENTMETRICS, SPI_GETWORKAREA, SWP_FRAMECHANGED, SWP_HIDEWINDOW, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, SWP_NOZORDER, SW_HIDE, SW_SHOW,
        SW_SHOWNOACTIVATE, WINDOWPLACEMENT, WM_ACTIVATE, WM_ACTIVATEAPP, WM_CANCELMODE,
        WM_CAPTURECHANGED, WM_CHAR, WM_CLOSE, WM_COMMAND, WM_DISPLAYCHANGE, WM_DPICHANGED,
        WM_DRAWITEM, WM_ENTERSIZEMOVE, WM_ERASEBKGND, WM_EXITSIZEMOVE, WM_GETMINMAXINFO,
        WM_KEYDOWN, WM_KEYUP, WM_KILLFOCUS, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN,
        WM_MBUTTONUP, WM_MEASUREITEM, WM_MOUSEACTIVATE, WM_MOUSEHWHEEL, WM_MOUSEMOVE,
        WM_MOUSEWHEEL, WM_MOVE, WM_NCCALCSIZE, WM_NCHITTEST, WM_NCLBUTTONDOWN, WM_NCLBUTTONUP,
        WM_PAINT, WM_RBUTTONDOWN, WM_RBUTTONUP, WM_SETCURSOR, WM_SETFOCUS, WM_SETTINGCHANGE,
        WM_SIZE, WM_SYSCOMMAND, WM_SYSKEYDOWN, WM_SYSKEYUP, WM_TIMER, WM_XBUTTONDOWN, WM_XBUTTONUP,
        WNDCLASSW, WS_CLIPCHILDREN, WS_CLIPSIBLINGS, WS_EX_LAYERED, WS_EX_NOACTIVATE,
        WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_EX_TRANSPARENT, WS_OVERLAPPEDWINDOW,
    };

    type Hglrc = isize;

    const GL_COLOR_BUFFER_BIT: u32 = 0x0000_4000;
    const MK_LBUTTON: u32 = 0x0001;
    const MK_RBUTTON: u32 = 0x0002;
    const MK_MBUTTON: u32 = 0x0010;
    const MK_XBUTTON1: u32 = 0x0020;
    const MK_XBUTTON2: u32 = 0x0040;
    const RETAINED_FRAME_REFRESH_INTERVAL: Duration = Duration::from_millis(250);
    const STEAM_DIALOG_SCAN_INTERVAL: Duration = Duration::from_millis(100);
    const MAX_STEAM_DIALOG_WINDOWS: usize = 16;
    const MODAL_PRESENT_TIMER_ID: usize = 0x5342;
    // Live sizing enters a nested Win32 modal loop. Presenting every 1 ms made
    // ResizeBuffers race prior flips repeatedly and could remove the D3D
    // device. Coalesce sizing paints to 60 Hz; normal display-rate presentation
    // resumes immediately after the modal loop exits.
    const MODAL_PRESENT_INTERVAL_MS: u32 = 16;
    const VK_TAB_CODE: i32 = 0x09;
    const VK_SHIFT_CODE: i32 = 0x10;
    const VK_CONTROL_CODE: i32 = 0x11;
    const VK_ALT_CODE: i32 = 0x12;
    const VK_CAPS_LOCK_CODE: i32 = 0x14;
    const VK_NUM_LOCK_CODE: i32 = 0x90;
    const VK_LEFT_SHIFT_CODE: i32 = 0xA0;
    const VK_RIGHT_SHIFT_CODE: i32 = 0xA1;
    const VK_LEFT_CONTROL_CODE: i32 = 0xA2;
    const VK_RIGHT_CONTROL_CODE: i32 = 0xA3;
    const VK_LEFT_ALT_CODE: i32 = 0xA4;
    const VK_RIGHT_ALT_CODE: i32 = 0xA5;

    struct WindowDisplayDiagnostics {
        device_name: String,
        refresh_rate: Option<u32>,
    }

    fn normalize_windows_display_refresh_rate(refresh_rate: u32) -> Option<u32> {
        // EnumDisplaySettings documents 0 and 1 as driver-defined default-rate
        // sentinels rather than measured Hz values. Let the consumer use its
        // Electron fallback when Windows returns either sentinel.
        (refresh_rate > 1).then_some(refresh_rate)
    }

    unsafe fn window_display_diagnostics(hwnd: HWND) -> Option<WindowDisplayDiagnostics> {
        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if monitor.is_null() {
            return None;
        }

        let mut monitor_info: MONITORINFOEXW = mem::zeroed();
        monitor_info.monitorInfo.cbSize = mem::size_of::<MONITORINFOEXW>() as u32;
        if GetMonitorInfoW(monitor, &mut monitor_info.monitorInfo) == 0 {
            return None;
        }

        let device_name_end = monitor_info
            .szDevice
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(monitor_info.szDevice.len());
        let device_name = String::from_utf16_lossy(&monitor_info.szDevice[..device_name_end]);
        if device_name.is_empty() {
            return None;
        }

        let mut display_mode: DEVMODEW = mem::zeroed();
        display_mode.dmSize = mem::size_of::<DEVMODEW>() as u16;
        let refresh_rate = if EnumDisplaySettingsW(
            monitor_info.szDevice.as_ptr(),
            ENUM_CURRENT_SETTINGS,
            &mut display_mode,
        ) != 0
        {
            normalize_windows_display_refresh_rate(display_mode.dmDisplayFrequency)
        } else {
            None
        };

        Some(WindowDisplayDiagnostics {
            device_name,
            refresh_rate,
        })
    }

    pub struct FrameLatencyWaitRequest {
        surface_generation: u64,
        handle: FrameLatencyWaitHandle,
    }

    #[derive(Clone, Copy)]
    pub struct FrameLatencyReadyToken {
        surface_generation: u64,
        renderer_generation: u64,
    }

    impl FrameLatencyWaitRequest {
        pub fn token(&self) -> FrameLatencyReadyToken {
            FrameLatencyReadyToken {
                surface_generation: self.surface_generation,
                renderer_generation: self.handle.generation(),
            }
        }

        pub fn wait(self, timeout_ms: u32) -> Result<Option<FrameLatencyReadyToken>, String> {
            let token = self.token();
            let ready = self.handle.wait(timeout_ms)?;
            Ok(ready.then_some(token))
        }
    }

    pub struct SharedTextureUpdateRequest {
        accepted: bool,
        copy_wait: Option<SharedTextureCopyWaitHandle>,
    }

    impl SharedTextureUpdateRequest {
        pub fn is_accepted(&self) -> bool {
            self.accepted
        }

        pub fn wait(self) -> Result<bool, String> {
            if let Some(copy_wait) = self.copy_wait {
                copy_wait.wait()?;
            }
            Ok(self.accepted)
        }
    }
    #[link(name = "opengl32")]
    extern "system" {
        fn glClear(mask: u32);
        fn glClearColor(red: f32, green: f32, blue: f32, alpha: f32);
        fn glViewport(x: i32, y: i32, width: i32, height: i32);
        fn wglCreateContext(hdc: HDC) -> Hglrc;
        fn wglDeleteContext(context: Hglrc) -> i32;
        fn wglMakeCurrent(hdc: HDC, context: Hglrc) -> i32;
    }

    struct NativeSurface {
        instance_generation: u64,
        hwnd: HWND,
        backend: WindowsNativeBackend,
        renderer: WindowsSurfaceRenderer,
        frame: u64,
        input_passthrough: bool,
        opaque: bool,
        cursor_hidden_requested: bool,
        cursor_suppressed: bool,
        cursor_display_count: Option<i32>,
        transparent_cursor: HCURSOR,
        continuous_present_requested: bool,
        target_frame_rate: Option<f64>,
        full_screen: bool,
        windowed_style: Option<u32>,
        windowed_placement: Option<WINDOWPLACEMENT>,
        presentation_ready: bool,
        requested_visible: bool,
        visible: bool,
        source_frame: Option<FrameUpload>,
        source_frame_dirty: bool,
        last_present_at: Option<Instant>,
        present_after_modal_loop: bool,
        modal_size_move_active: bool,
        overlay_shortcut_down: bool,
        overlay_active: bool,
        steam_dialog_baseline: SteamDialogWindowList,
        adopted_steam_dialog: Option<AdoptedSteamDialog>,
        last_steam_dialog_scan_at: Option<Instant>,
        steam_dialog_adoption_count: u64,
        last_adopted_steam_dialog_hwnd: Option<HWND>,
        standalone_min_client_size: Option<(i32, i32)>,
        menu: Option<HMENU>,
        menu_draw_tokens: Vec<usize>,
        menu_minimum_dpi: Option<u32>,
    }

    struct FrameUpload {
        width: i32,
        height: i32,
        data: Vec<u8>,
    }

    #[derive(Clone, Copy)]
    struct SteamDialogWindowList {
        hwnds: [HWND; MAX_STEAM_DIALOG_WINDOWS],
        len: usize,
    }

    impl Default for SteamDialogWindowList {
        fn default() -> Self {
            Self {
                hwnds: [ptr::null_mut(); MAX_STEAM_DIALOG_WINDOWS],
                len: 0,
            }
        }
    }

    impl SteamDialogWindowList {
        fn contains(&self, hwnd: HWND) -> bool {
            self.hwnds[..self.len].contains(&hwnd)
        }
    }

    struct AdoptedSteamDialog {
        hwnd: HWND,
        process_id: u32,
        original_owner_hwnd: HWND,
        original_rect: RECT,
        last_host_client_rect: RECT,
    }

    #[allow(clippy::large_enum_variant)] // One process-global surface; boxing D3D state adds no useful density.
    enum WindowsSurfaceRenderer {
        OpenGl {
            hdc: HDC,
            hglrc: Hglrc,
        },
        D3d11 {
            renderer: WindowsD3d11Renderer,
            last_frame_upload: bool,
            frame_upload_failures: u64,
            device_lost: bool,
            device_lost_count: u64,
            device_recovery_count: u64,
        },
    }

    #[derive(Clone, Copy, PartialEq, Eq)]
    enum WindowsNativeBackend {
        OpenGl,
        D3d11,
    }

    impl WindowsNativeBackend {
        fn from_env() -> Self {
            match env::var("STEAM_BRIDGE_WINDOWS_NATIVE_HOST_BACKEND") {
                Ok(value) => match value.trim().to_ascii_lowercase().as_str() {
                    "opengl" | "gl" | "wgl" | "windows-opengl" => Self::OpenGl,
                    _ => Self::D3d11,
                },
                Err(_) => Self::D3d11,
            }
        }

        fn as_str(self) -> &'static str {
            match self {
                Self::OpenGl => "windows-opengl",
                Self::D3d11 => "windows-d3d11",
            }
        }
    }

    unsafe impl Send for NativeSurface {}

    static SURFACE: Lazy<Mutex<Option<NativeSurface>>> = Lazy::new(|| Mutex::new(None));
    static NEXT_SURFACE_INSTANCE_GENERATION: AtomicU64 = AtomicU64::new(0);
    static STANDALONE_MIN_CLIENT_SIZE: AtomicU64 = AtomicU64::new(0);
    static STANDALONE_LOGICAL_CLIENT_SIZE: AtomicU64 = AtomicU64::new(0);
    static STANDALONE_WINDOW_DPI: AtomicU32 = AtomicU32::new(96);
    static STANDALONE_DISPLAY_CLAMPED: AtomicBool = AtomicBool::new(false);
    static WINDOW_CLASS_RESULT: OnceLock<Result<(), String>> = OnceLock::new();
    static WINDOW_MESSAGE_DIAGNOSTICS: Lazy<Mutex<WindowMessageDiagnostics>> =
        Lazy::new(|| Mutex::new(WindowMessageDiagnostics::default()));
    static WINDOW_INPUT_EVENTS: Lazy<Mutex<Vec<WindowInputEvent>>> =
        Lazy::new(|| Mutex::new(Vec::new()));
    static WINDOW_GEOMETRY_DIAGNOSTICS: Lazy<Mutex<Option<WindowGeometryDiagnostics>>> =
        Lazy::new(|| Mutex::new(None));
    static MENU_DRAW_ITEMS: Lazy<Mutex<HashMap<usize, Box<NativeMenuOwnerDrawData>>>> =
        Lazy::new(|| Mutex::new(HashMap::new()));

    #[derive(Clone, Default, Serialize)]
    struct WindowMessageCounters {
        total: u64,
        key_down: u64,
        key_up: u64,
        sys_key_down: u64,
        sys_key_up: u64,
        mouse_move: u64,
        left_button_down: u64,
        left_button_up: u64,
        close: u64,
        set_focus: u64,
        kill_focus: u64,
        activate: u64,
        activate_app: u64,
        mouse_activate: u64,
        command: u64,
        nc_hit_test: u64,
        nc_left_button_down: u64,
        nc_left_button_up: u64,
        system_command: u64,
        enter_size_move: u64,
        exit_size_move: u64,
        capture_changed: u64,
    }

    #[derive(Clone, Serialize)]
    struct WindowMessageEvent {
        at_ms: u64,
        hwnd: String,
        message: u32,
        name: &'static str,
        wparam: u64,
        lparam: i64,
    }

    #[derive(Clone, Default, Serialize)]
    struct WindowMessageDiagnostics {
        counters: WindowMessageCounters,
        recent: Vec<WindowMessageEvent>,
    }

    #[derive(Clone, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct WindowInputEvent {
        kind: &'static str,
        captured_at_ms: u64,
        message: u32,
        wparam: u64,
        lparam: i64,
        shift: bool,
        control: bool,
        alt: bool,
        caps_lock: bool,
        num_lock: bool,
        x: Option<i32>,
        y: Option<i32>,
        delta_x: Option<i32>,
        delta_y: Option<i32>,
        command_id: Option<u32>,
        client_width: i32,
        client_height: i32,
        minimized: bool,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct NativeMenuItem {
        #[serde(default)]
        label: String,
        command_id: Option<u32>,
        #[serde(default = "menu_item_enabled")]
        enabled: bool,
        #[serde(default)]
        separator: bool,
        #[serde(default)]
        items: Vec<NativeMenuItem>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct NativeMenuOptions {
        items: Vec<NativeMenuItem>,
        minimum_scale: f64,
    }

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum NativeMenuDefinition {
        Items(Vec<NativeMenuItem>),
        Options(NativeMenuOptions),
    }

    #[derive(Clone, Copy, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct GeometrySize {
        width: i32,
        height: i32,
    }

    #[derive(Clone, Copy, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct GeometryResidual {
        width: i32,
        height: i32,
    }

    #[derive(Clone, Copy, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct GeometryRect {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }

    impl From<RECT> for GeometryRect {
        fn from(rect: RECT) -> Self {
            Self {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
            }
        }
    }

    #[derive(Clone, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct WindowGeometryDiagnostics {
        operation: &'static str,
        dpi: u32,
        window_per_monitor_v2: bool,
        style: u32,
        ex_style: u32,
        menu_attached: bool,
        desired_logical_client: Option<GeometrySize>,
        requested_physical_client: GeometrySize,
        minimum_physical_client: Option<GeometrySize>,
        pre_outer: GeometryRect,
        pre_client: GeometryRect,
        work_area: GeometryRect,
        adjust_window_rect_estimate: GeometryRect,
        nc_calc_size_estimate: GeometryRect,
        candidate_outer: GeometryRect,
        final_outer: Option<GeometryRect>,
        final_client: Option<GeometryRect>,
        clamp_reason: &'static str,
        correction_count: u8,
        final_residual: Option<GeometryResidual>,
        draw_menu_bar_result: Option<bool>,
        success: bool,
        error: Option<String>,
    }

    impl WindowGeometryDiagnostics {
        fn compact(&self) -> String {
            let final_client = self.final_client.map_or_else(
                || "unknown".to_owned(),
                |rect| {
                    format!(
                        "{}x{}",
                        (i64::from(rect.right) - i64::from(rect.left)).max(0),
                        (i64::from(rect.bottom) - i64::from(rect.top)).max(0)
                    )
                },
            );
            format!(
                "operation={} dpi={} style={:#x} exStyle={:#x} menuAttached={} requested={}x{} final={} work={}x{} clamp={} corrections={}",
                self.operation,
                self.dpi,
                self.style,
                self.ex_style,
                self.menu_attached,
                self.requested_physical_client.width,
                self.requested_physical_client.height,
                final_client,
                (i64::from(self.work_area.right) - i64::from(self.work_area.left)).max(0),
                (i64::from(self.work_area.bottom) - i64::from(self.work_area.top)).max(0),
                self.clamp_reason,
                self.correction_count
            )
        }
    }

    #[derive(Clone, Copy)]
    struct OuterClampPlan {
        rect: RECT,
        width_clamped: bool,
        height_clamped: bool,
        position_clamped: bool,
    }

    impl OuterClampPlan {
        fn size_clamped(self) -> bool {
            self.width_clamped || self.height_clamped
        }

        fn reason(self) -> &'static str {
            match (
                self.width_clamped,
                self.height_clamped,
                self.position_clamped,
            ) {
                (false, false, false) => "none",
                (false, false, true) => "position",
                (true, false, false) => "width",
                (false, true, false) => "height",
                (true, true, false) => "width-height",
                (true, false, true) => "width-position",
                (false, true, true) => "height-position",
                (true, true, true) => "width-height-position",
            }
        }

        fn followed_by(self, next: Self) -> Self {
            Self {
                rect: next.rect,
                width_clamped: self.width_clamped || next.width_clamped,
                height_clamped: self.height_clamped || next.height_clamped,
                position_clamped: self.position_clamped || next.position_clamped,
            }
        }
    }

    #[derive(Clone, Copy)]
    struct MenuRollbackResult {
        menu_restored: bool,
        menu_drawn: bool,
        geometry_restored: bool,
        candidate_detached: bool,
        candidate_adopted_for_safety: bool,
    }

    impl MenuRollbackResult {
        fn summary(self) -> String {
            format!(
                "menuRestored={} menuDrawn={} geometryRestored={} candidateDetached={} candidateAdoptedForSafety={}",
                self.menu_restored,
                self.menu_drawn,
                self.geometry_restored,
                self.candidate_detached,
                self.candidate_adopted_for_safety
            )
        }
    }

    #[derive(Clone)]
    struct NativeMenuDrawItem {
        label: Vec<u16>,
        measure_label: Vec<u16>,
        top_level: bool,
        submenu: bool,
        separator: bool,
        minimum_dpi: u32,
    }

    #[repr(C)]
    struct NativeMenuOwnerDrawData {
        // Microsoft Active Accessibility requires this to be the first member of an
        // owner-drawn menu item's application data.
        msaa: MSAAMENUINFO,
        draw: NativeMenuDrawItem,
        _accessible_text: Box<[u16]>,
    }

    // The registry owns this allocation for exactly as long as the HMENU can refer to it.
    // Its embedded MSAA pointer targets its own stable boxed UTF-16 allocation.
    unsafe impl Send for NativeMenuOwnerDrawData {}

    struct ThreadDpiAwarenessGuard {
        previous: DPI_AWARENESS_CONTEXT,
    }

    impl ThreadDpiAwarenessGuard {
        unsafe fn per_monitor_v2() -> Self {
            Self {
                previous: set_thread_per_monitor_v2(),
            }
        }
    }

    impl Drop for ThreadDpiAwarenessGuard {
        fn drop(&mut self) {
            if !self.previous.is_null() {
                unsafe {
                    restore_thread_dpi_awareness(self.previous);
                }
            }
        }
    }

    fn menu_item_enabled() -> bool {
        true
    }

    pub fn open(
        title: Option<String>,
        client_width: Option<u32>,
        client_height: Option<u32>,
        min_client_width: Option<u32>,
        min_client_height: Option<u32>,
    ) -> Result<(), Error> {
        close();
        let title = title.unwrap_or_else(|| "Steam Bridge Native Overlay Probe".to_owned());
        let mut client_size = client_width.zip(client_height).map(|(width, height)| {
            (
                width.max(1).min(i32::MAX as u32) as i32,
                height.max(1).min(i32::MAX as u32) as i32,
            )
        });
        let min_client_size = min_client_width
            .zip(min_client_height)
            .map(|(width, height)| {
                (
                    width.max(1).min(i32::MAX as u32) as i32,
                    height.max(1).min(i32::MAX as u32) as i32,
                )
            });
        client_size = clamp_client_size_to_minimum(client_size, min_client_size);
        set_standalone_min_client_size(min_client_size);
        set_standalone_logical_client_size(client_size);
        STANDALONE_DISPLAY_CLAMPED.store(false, Ordering::Relaxed);
        *WINDOW_GEOMETRY_DIAGNOSTICS
            .lock()
            .expect("Steam overlay window geometry diagnostic lock poisoned") = None;
        let surface = match unsafe { create_surface(&title, client_size, min_client_size) } {
            Ok(surface) => surface,
            Err(error) => {
                set_standalone_min_client_size(None);
                set_standalone_logical_client_size(None);
                STANDALONE_DISPLAY_CLAMPED.store(false, Ordering::Relaxed);
                return Err(error);
            }
        };
        *SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned") = Some(surface);
        pump()?;
        Ok(())
    }

    pub fn attach_to_parent(
        parent_handle: usize,
        _initial_bounds: Option<(i32, i32, u32, u32)>,
    ) -> Result<(), Error> {
        if parent_handle == 0 {
            return Err(Error::from_reason(
                "Electron native window handle was empty",
            ));
        }

        Err(Error::from_reason(
            "Windows attached overlay hosts are unsupported: Steam did not render into the tested WS_CHILD swapchain, and popup hosts do not safely follow Electron window lifecycle. Use startNativeOverlaySession() with an offscreen Electron renderer.",
        ))
    }

    pub fn attach_to_parent_for_overlay(parent_handle: usize) -> Result<(), Error> {
        attach_to_parent(parent_handle, None)
    }

    pub fn show() -> Result<(), Error> {
        with_surface(|surface| unsafe {
            surface.requested_visible = true;
            sync_window_style(surface);
            sync_surface_visibility(surface);
            if surface.visible && !surface.input_passthrough {
                activate_window(surface);
            }
        })
    }

    pub fn hide() -> Result<(), Error> {
        with_surface(|surface| unsafe {
            surface.requested_visible = false;
            hide_window_without_activation(surface.hwnd);
            surface.visible = false;
            surface.presentation_ready = false;
        })
    }

    pub fn set_bounds(x: i32, y: i32, width: u32, height: u32) -> Result<(), Error> {
        // Bounds arrive as physical pixels from Electron screen.dipToScreenRect.
        // Release the surface lock before SetWindowPos dispatches size/focus messages.
        let hwnd = SURFACE.lock().unwrap().as_ref().map(|s| s.hwnd);
        if let Some(hwnd) = hwnd {
            let ok = unsafe { SetWindowPos(hwnd, ptr::null_mut(), x, y,
                width.max(1) as i32, height.max(1) as i32,
                SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_NOACTIVATE) };
            if ok == 0 { return Err(Error::from_reason("Native window bounds update failed")); }
        }
        Ok(())
    }

    pub fn set_input_passthrough(pass_through: bool) -> Result<(), Error> {
        with_surface(|surface| unsafe {
            if surface.input_passthrough == pass_through {
                return;
            }
            surface.input_passthrough = pass_through;
            sync_window_style(surface);
            sync_surface_visibility(surface);
            if surface.visible && !pass_through {
                activate_window(surface);
            }
        })
    }

    pub fn set_opaque(opaque: bool) -> Result<(), Error> {
        with_surface(|surface| unsafe {
            if surface.opaque == opaque {
                return;
            }
            surface.opaque = opaque;
            if opaque {
                surface.presentation_ready = false;
                surface.source_frame = None;
                if let WindowsSurfaceRenderer::D3d11 {
                    last_frame_upload, ..
                } = &mut surface.renderer
                {
                    *last_frame_upload = false;
                }
            }
            sync_window_style(surface);
            sync_surface_visibility(surface);
        })
    }

    pub fn set_cursor_hidden(hidden: bool) -> Result<(), Error> {
        with_surface(|surface| unsafe {
            surface.cursor_hidden_requested = hidden;
            sync_cursor_visibility(surface);
        })
    }

    pub fn set_overlay_active(active: bool) -> Result<(), Error> {
        with_surface(|surface| unsafe {
            if surface.overlay_active == active {
                return;
            }
            surface.overlay_active = active;
            surface.last_steam_dialog_scan_at = None;
            if active {
                surface.steam_dialog_baseline = enumerate_steam_dialog_windows();
            } else {
                restore_adopted_steam_dialog(surface);
                surface.steam_dialog_baseline = SteamDialogWindowList::default();
            }
        })
    }

    pub fn set_continuous_present(continuous: bool, frame_rate: Option<f64>) -> Result<(), Error> {
        with_surface(|surface| unsafe {
            let target_frame_rate = frame_rate.filter(|value| value.is_finite() && *value > 0.0);
            surface.target_frame_rate = target_frame_rate;
            let display_refresh_rate =
                window_display_diagnostics(surface.hwnd).and_then(|display| display.refresh_rate);
            if let WindowsSurfaceRenderer::D3d11 { renderer, .. } = &mut surface.renderer {
                renderer.set_present_sync_interval(
                    windows_d3d11::present_sync_interval_for_frame_rate(
                        display_refresh_rate,
                        target_frame_rate,
                    ),
                );
            }
            if surface.continuous_present_requested != continuous {
                surface.continuous_present_requested = continuous;
                // Steam composites its UI into the presented backbuffer. When
                // continuous presentation starts or stops, upload the clean
                // Electron frame so Steam pixels cannot become retained input.
                surface.source_frame_dirty = true;
            }
        })
    }

    pub fn set_full_screen(full_screen: bool) -> Result<(), Error> {
        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let Some(surface) = guard.as_mut() else {
            return Ok(());
        };
        if surface.full_screen == full_screen {
            return Ok(());
        }

        unsafe {
            if full_screen {
                let mut placement: WINDOWPLACEMENT = mem::zeroed();
                placement.length = mem::size_of::<WINDOWPLACEMENT>() as u32;
                let monitor = MonitorFromWindow(surface.hwnd, MONITOR_DEFAULTTONEAREST);
                let mut monitor_info: MONITORINFO = mem::zeroed();
                monitor_info.cbSize = mem::size_of::<MONITORINFO>() as u32;
                if GetWindowPlacement(surface.hwnd, &mut placement) == 0
                    || monitor.is_null()
                    || GetMonitorInfoW(monitor, &mut monitor_info) == 0
                {
                    return Err(Error::from_reason(
                        "Failed to inspect the native overlay host before fullscreen",
                    ));
                }

                let style = GetWindowLongPtrW(surface.hwnd, GWL_STYLE) as u32;
                surface.windowed_style = Some(style);
                surface.windowed_placement = Some(placement);
                if !set_window_menu_attached(surface, false) {
                    surface.windowed_style = None;
                    surface.windowed_placement = None;
                    return Err(Error::from_reason(
                        "Failed to hide the native overlay host menu for fullscreen",
                    ));
                }
                SetWindowLongPtrW(
                    surface.hwnd,
                    GWL_STYLE,
                    (style & !WS_OVERLAPPEDWINDOW) as isize,
                );
                let rect = monitor_info.rcMonitor;
                if SetWindowPos(
                    surface.hwnd,
                    ptr::null_mut(),
                    rect.left,
                    rect.top,
                    (rect.right - rect.left).max(1),
                    (rect.bottom - rect.top).max(1),
                    SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED,
                ) == 0
                {
                    SetWindowLongPtrW(surface.hwnd, GWL_STYLE, style as isize);
                    SetWindowPos(
                        surface.hwnd,
                        ptr::null_mut(),
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE
                            | SWP_NOSIZE
                            | SWP_NOOWNERZORDER
                            | SWP_NOZORDER
                            | SWP_FRAMECHANGED,
                    );
                    surface.windowed_style = None;
                    surface.windowed_placement = None;
                    set_window_menu_attached(surface, true);
                    return Err(Error::from_reason(
                        "Failed to resize the native overlay host for fullscreen",
                    ));
                }
            } else {
                let style = surface
                    .windowed_style
                    .unwrap_or(WS_OVERLAPPEDWINDOW | WS_CLIPSIBLINGS | WS_CLIPCHILDREN);
                SetWindowLongPtrW(surface.hwnd, GWL_STYLE, style as isize);
                if !set_window_menu_attached(surface, true) {
                    return Err(Error::from_reason(
                        "Failed to restore the native overlay host menu from fullscreen",
                    ));
                }
                let placement_restored = if let Some(mut placement) = surface.windowed_placement {
                    placement.length = mem::size_of::<WINDOWPLACEMENT>() as u32;
                    SetWindowPlacement(surface.hwnd, &placement) != 0
                } else {
                    true
                };
                let frame_refreshed = SetWindowPos(
                    surface.hwnd,
                    ptr::null_mut(),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED,
                ) != 0;
                if !placement_restored || !frame_refreshed {
                    return Err(Error::from_reason(
                        "Failed to restore the native overlay host from fullscreen",
                    ));
                }
                surface.windowed_style = None;
                surface.windowed_placement = None;
            }
        }

        surface.full_screen = full_screen;
        unsafe {
            set_window_corner_preference(surface.hwnd, full_screen);
        }
        surface.source_frame_dirty = true;
        if surface.visible {
            unsafe {
                render_surface(surface)?;
            }
        }
        Ok(())
    }

    pub fn set_presentation_marker(_marker: String) -> Result<(), Error> {
        Ok(())
    }

    pub fn set_menu_json(menu_json: String) -> Result<(), Error> {
        let definition: NativeMenuDefinition =
            serde_json::from_str(&menu_json).map_err(|error| {
                Error::from_reason(format!("Invalid native overlay host menu JSON: {error}"))
            })?;
        let (items, minimum_dpi) = match definition {
            NativeMenuDefinition::Items(items) => (items, None),
            NativeMenuDefinition::Options(options) => {
                let minimum_dpi = minimum_menu_dpi(options.minimum_scale)?;
                (options.items, Some(minimum_dpi))
            }
        };
        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let Some(surface) = guard.as_mut() else {
            return Ok(());
        };
        unsafe {
            let _dpi_awareness = ThreadDpiAwarenessGuard::per_monitor_v2();
            let client = read_client_rect(surface.hwnd).ok_or_else(|| {
                Error::from_reason("Failed to inspect the native overlay host client size")
            })?;
            let window = read_window_rect(surface.hwnd).ok_or_else(|| {
                Error::from_reason("Failed to inspect the native overlay host window size")
            })?;
            let client_size = positive_rect_size(client).ok_or_else(|| {
                Error::from_reason(
                    "Native overlay host client geometry was invalid before changing its menu",
                )
            })?;
            positive_rect_size(window).ok_or_else(|| {
                Error::from_reason(
                    "Native overlay host outer geometry was invalid before changing its menu",
                )
            })?;
            let dpi = dpi_for_window(surface.hwnd).max(96);
            let desired_logical_client = standalone_logical_client_size().or_else(|| {
                Some((
                    physical_pixels_to_logical(client_size.0, dpi),
                    physical_pixels_to_logical(client_size.1, dpi),
                ))
            });
            let requested_physical_client = desired_logical_client.map_or_else(
                || client_size,
                |(width, height)| {
                    (
                        logical_pixels_to_physical(width, dpi),
                        logical_pixels_to_physical(height, dpi),
                    )
                },
            );
            let minimum_physical_client =
                surface.standalone_min_client_size.map(|(width, height)| {
                    (
                        logical_pixels_to_physical(width, dpi),
                        logical_pixels_to_physical(height, dpi),
                    )
                });
            let mut menu_draw_tokens = Vec::new();
            let menu = if items.is_empty() {
                None
            } else {
                match build_native_menu(&items, false, minimum_dpi, &mut menu_draw_tokens) {
                    Ok(menu) => Some(menu),
                    Err(error) => {
                        unregister_menu_draw_items(&menu_draw_tokens);
                        return Err(error);
                    }
                }
            };
            let menu_handle = menu.unwrap_or(ptr::null_mut());
            let attached_menu_handle = if surface.full_screen {
                ptr::null_mut()
            } else {
                menu_handle
            };
            let previous_attached_menu = GetMenu(surface.hwnd);
            if SetMenu(surface.hwnd, attached_menu_handle) == 0 {
                let geometry = record_menu_transaction_failure(
                    surface.hwnd,
                    dpi,
                    desired_logical_client,
                    requested_physical_client,
                    minimum_physical_client,
                    window,
                    client,
                    None,
                    "Failed to attach the native overlay host menu",
                );
                let rollback = rollback_failed_menu_transaction(
                    surface,
                    previous_attached_menu,
                    window,
                    menu,
                    menu_draw_tokens,
                    minimum_dpi,
                );
                return Err(Error::from_reason(format!(
                    "Failed to attach the native overlay host menu (geometry={geometry}; rollback={})",
                    rollback.summary()
                )));
            }
            let draw_menu_bar_result = DrawMenuBar(surface.hwnd) != 0;
            if !draw_menu_bar_result {
                let geometry = record_menu_transaction_failure(
                    surface.hwnd,
                    dpi,
                    desired_logical_client,
                    requested_physical_client,
                    minimum_physical_client,
                    window,
                    client,
                    Some(false),
                    "Failed to draw the native overlay host menu",
                );
                let rollback = rollback_failed_menu_transaction(
                    surface,
                    previous_attached_menu,
                    window,
                    menu,
                    menu_draw_tokens,
                    minimum_dpi,
                );
                return Err(Error::from_reason(format!(
                    "Failed to draw the native overlay host menu (geometry={geometry}; rollback={})",
                    rollback.summary()
                )));
            }
            if !surface.full_screen {
                if let Err(error) = resize_window_for_client_size(
                    surface.hwnd,
                    window.left,
                    window.top,
                    requested_physical_client.0,
                    requested_physical_client.1,
                    desired_logical_client,
                    minimum_physical_client,
                    None,
                    "menu-change",
                    Some(draw_menu_bar_result),
                ) {
                    let rollback = rollback_failed_menu_transaction(
                        surface,
                        previous_attached_menu,
                        window,
                        menu,
                        menu_draw_tokens,
                        minimum_dpi,
                    );
                    return Err(Error::from_reason(format!(
                        "{error} (menu rollback={})",
                        rollback.summary()
                    )));
                }
            }
            let previous_draw_tokens =
                mem::replace(&mut surface.menu_draw_tokens, menu_draw_tokens);
            surface.menu_minimum_dpi = minimum_dpi;
            let previous_menu = mem::replace(&mut surface.menu, menu);
            if let Some(previous) = previous_menu {
                if !previous.is_null() {
                    DestroyMenu(previous);
                }
            }
            unregister_menu_draw_items(&previous_draw_tokens);
        }
        Ok(())
    }

    pub fn pump() -> Result<(), Error> {
        let hwnd = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned")
            .as_ref()
            .map(|surface| surface.hwnd);
        let Some(hwnd) = hwnd else {
            return Ok(());
        };

        unsafe {
            // Dispatching SC_SIZE/SC_MOVE enters a nested Windows modal loop.
            // Do not hold the surface lock across it: WM_SIZE/WM_PAINT must be
            // able to repaint the retained frame while the user is dragging.
            pump_messages(hwnd);
        }

        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let Some(surface) = guard.as_mut().filter(|surface| surface.hwnd == hwnd) else {
            return Ok(());
        };

        let result = unsafe {
            sync_steam_dialog(surface);
            sync_cursor_visibility(surface);
            poll_overlay_shortcut(surface);
            let present_after_modal_loop = mem::take(&mut surface.present_after_modal_loop);
            if surface.visible && (present_after_modal_loop || surface_needs_render(surface)) {
                render_surface(surface)
            } else {
                Ok(())
            }
        };

        if let Err(error) = result {
            let failed_surface = guard.take();
            drop(guard);
            if let Some(surface) = failed_surface {
                unsafe {
                    destroy_surface(surface);
                }
            }
            return Err(error);
        }

        Ok(())
    }

    pub fn frame_pending() -> bool {
        SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned")
            .as_ref()
            .is_some_and(|surface| {
                // Presentation readiness stays false until the first real
                // source frame has been shown. It does not itself mean a frame
                // exists to present. Restrict the async DXGI path to a D3D
                // renderer that actually retains a source; otherwise an
                // unavailable wait handle could resolve false in a microtask
                // loop during startup or under the diagnostic OpenGL backend.
                surface.source_frame_dirty
                    && matches!(
                        &surface.renderer,
                        WindowsSurfaceRenderer::D3d11 { renderer, .. }
                            if renderer.has_source() || surface.source_frame.is_some()
                    )
            })
    }

    pub fn frame_latency_wait_bypassed() -> bool {
        SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned")
            .as_ref()
            .is_some_and(|surface| {
                matches!(
                    &surface.renderer,
                    WindowsSurfaceRenderer::D3d11 { renderer, .. }
                        if renderer.frame_latency_wait_bypassed()
                )
            })
    }

    pub fn begin_frame_latency_wait() -> Result<Option<FrameLatencyWaitRequest>, Error> {
        let guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let Some(surface) = guard.as_ref() else {
            return Ok(None);
        };
        let WindowsSurfaceRenderer::D3d11 { renderer, .. } = &surface.renderer else {
            return Ok(None);
        };
        let Some(handle) = renderer
            .duplicate_frame_latency_wait_handle()
            .map_err(Error::from_reason)?
        else {
            return Ok(None);
        };
        Ok(Some(FrameLatencyWaitRequest {
            surface_generation: surface.instance_generation,
            handle,
        }))
    }

    pub fn grant_frame_latency_ready(token: FrameLatencyReadyToken) -> bool {
        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let Some(surface) = guard
            .as_mut()
            .filter(|surface| surface.instance_generation == token.surface_generation)
        else {
            return false;
        };
        let WindowsSurfaceRenderer::D3d11 { renderer, .. } = &mut surface.renderer else {
            return false;
        };
        renderer.grant_frame_latency_ready_permit(token.renderer_generation)
    }

    pub fn bypass_frame_latency_wait(token: FrameLatencyReadyToken) -> bool {
        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let Some(surface) = guard
            .as_mut()
            .filter(|surface| surface.instance_generation == token.surface_generation)
        else {
            return false;
        };
        let WindowsSurfaceRenderer::D3d11 { renderer, .. } = &mut surface.renderer else {
            return false;
        };
        renderer.bypass_frame_latency_wait(token.renderer_generation)
    }

    pub fn update_frame(buffer: Buffer, width: u32, height: u32) -> Result<(), Error> {
        let expected_len = checked_native_overlay_frame_byte_len(width, height, "Windows")?;
        let width = width as i32;
        let height = height as i32;
        if buffer.len() < expected_len {
            return Err(Error::from_reason(format!(
                "Windows native overlay frame needs {expected_len} BGRA bytes, received {}",
                buffer.len()
            )));
        }

        with_surface(|surface| {
            surface.source_frame = Some(FrameUpload {
                width,
                height,
                data: buffer[..expected_len].to_vec(),
            });
            surface.source_frame_dirty = true;
        })
    }

    pub fn update_shared_texture(
        handle_buffer: Buffer,
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
    ) -> Result<(), Error> {
        begin_shared_texture_update_internal(
            handle_buffer,
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
            false,
        )?
        .wait()
        .map(|_| ())
        .map_err(Error::from_reason)
    }

    pub fn begin_shared_texture_update(
        handle_buffer: Buffer,
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
    ) -> Result<SharedTextureUpdateRequest, Error> {
        begin_shared_texture_update_internal(
            handle_buffer,
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
            true,
        )
    }

    #[allow(clippy::too_many_arguments)]
    fn begin_shared_texture_update_internal(
        handle_buffer: Buffer,
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
        asynchronous_completion: bool,
    ) -> Result<SharedTextureUpdateRequest, Error> {
        let handle_size = mem::size_of::<usize>();
        if handle_buffer.len() < handle_size {
            return Err(Error::from_reason(format!(
                "Windows shared texture handle needs {handle_size} bytes, received {}",
                handle_buffer.len()
            )));
        }
        let mut handle_bytes = [0_u8; mem::size_of::<usize>()];
        handle_bytes.copy_from_slice(&handle_buffer[..handle_size]);
        let handle = usize::from_ne_bytes(handle_bytes);
        let width = width.max(1);
        let height = height.max(1);
        let content_rect = (
            content_x.unwrap_or(0),
            content_y.unwrap_or(0),
            content_width.unwrap_or(width),
            content_height.unwrap_or(height),
        );
        let presentation_rect = (
            presentation_x.unwrap_or(0),
            presentation_y.unwrap_or(0),
            presentation_width.unwrap_or(width),
            presentation_height.unwrap_or(height),
        );
        let content_right = content_rect.0.checked_add(content_rect.2).ok_or_else(|| {
            Error::from_reason("Windows shared texture content rectangle overflows")
        })?;
        let content_bottom = content_rect.1.checked_add(content_rect.3).ok_or_else(|| {
            Error::from_reason("Windows shared texture content rectangle overflows")
        })?;
        if content_rect.2 == 0
            || content_rect.3 == 0
            || content_right > width
            || content_bottom > height
        {
            return Err(Error::from_reason(format!(
                "Windows shared texture content rectangle {},{} {}x{} exceeds {}x{}",
                content_rect.0, content_rect.1, content_rect.2, content_rect.3, width, height
            )));
        }
        let presentation_right = presentation_rect
            .0
            .checked_add(presentation_rect.2)
            .ok_or_else(|| {
                Error::from_reason("Windows shared texture presentation rectangle overflows")
            })?;
        let presentation_bottom = presentation_rect
            .1
            .checked_add(presentation_rect.3)
            .ok_or_else(|| {
                Error::from_reason("Windows shared texture presentation rectangle overflows")
            })?;
        if presentation_rect.2 == 0
            || presentation_rect.3 == 0
            || presentation_right > width
            || presentation_bottom > height
        {
            return Err(Error::from_reason(format!(
                "Windows shared texture presentation rectangle {},{} {}x{} exceeds {}x{}",
                presentation_rect.0,
                presentation_rect.1,
                presentation_rect.2,
                presentation_rect.3,
                width,
                height
            )));
        }

        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let surface = guard
            .as_mut()
            .ok_or_else(|| Error::from_reason("Native overlay host is not open"))?;
        let hwnd = surface.hwnd;
        let mut accepted = true;
        let mut copy_wait = None;
        match &mut surface.renderer {
            WindowsSurfaceRenderer::D3d11 {
                renderer,
                last_frame_upload,
                device_lost,
                device_lost_count,
                device_recovery_count,
                ..
            } => unsafe {
                let recovering_device = *device_lost;
                let import_result = if recovering_device {
                    Ok(SharedTextureImportSubmission::Dropped)
                } else if asynchronous_completion {
                    renderer.begin_import_shared_texture(
                        handle,
                        width,
                        height,
                        content_rect,
                        presentation_rect,
                    )
                } else {
                    renderer
                        .import_shared_texture(
                            handle,
                            width,
                            height,
                            content_rect,
                            presentation_rect,
                        )
                        .map(|_| SharedTextureImportSubmission::Accepted(None))
                };
                let import_detected_device_loss = import_result
                    .as_ref()
                    .err()
                    .map(String::as_str)
                    .is_some_and(windows_d3d11::is_device_lost_error);
                let import_requires_adapter_switch = import_result
                    .as_ref()
                    .err()
                    .map(String::as_str)
                    .is_some_and(windows_d3d11::is_shared_texture_adapter_open_error);
                if import_detected_device_loss {
                    *device_lost = true;
                    *device_lost_count = (*device_lost_count).saturating_add(1);
                    *last_frame_upload = false;
                }
                if recovering_device
                    || import_detected_device_loss
                    || import_requires_adapter_switch
                {
                    renderer
                        .switch_to_shared_texture_adapter(
                            hwnd.cast(),
                            handle,
                            width,
                            height,
                            content_rect,
                            presentation_rect,
                        )
                        .map_err(Error::from_reason)?;
                } else {
                    match import_result {
                        Ok(SharedTextureImportSubmission::Accepted(wait)) => copy_wait = wait,
                        Ok(SharedTextureImportSubmission::Dropped) => accepted = false,
                        Err(error) => {
                            // The current device opened the handle, so validation
                            // or copy-completion failures are not evidence of an
                            // adapter mismatch. Preserve the existing device and
                            // let the producer submit a fresh texture.
                            return Err(Error::from_reason(error));
                        }
                    }
                }
                if recovering_device || import_detected_device_loss {
                    *device_lost = false;
                    *device_recovery_count = (*device_recovery_count).saturating_add(1);
                }
                if accepted {
                    *last_frame_upload = true;
                }
            },
            WindowsSurfaceRenderer::OpenGl { .. } => {
                return Err(Error::from_reason(
                    "Electron shared textures require the Windows D3D11 native host backend",
                ));
            }
        }
        if accepted {
            surface.source_frame = None;
            // Importing updates the retained D3D source, but a non-continuous
            // session still needs its next pump to present that new source.
            surface.source_frame_dirty = true;
        }
        Ok(SharedTextureUpdateRequest {
            accepted,
            copy_wait,
        })
    }

    pub fn close() {
        let surface = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned")
            .take();
        if let Some(surface) = surface {
            unsafe {
                destroy_surface(surface);
            }
        }
    }

    pub fn close_probe() {
        close();
    }

    pub fn detach_host() {}

    pub fn is_probe_open() -> bool {
        SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned")
            .is_some()
    }

    pub fn is_embedded() -> bool {
        false
    }

    pub fn mac_window_snapshot_json(_app_id: u32) -> Option<String> {
        None
    }

    pub fn mac_screen_locked() -> bool {
        false
    }

    pub fn mac_display_asleep() -> bool {
        false
    }

    pub fn host_diagnostics_json() -> Option<String> {
        let guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        let surface = guard.as_ref()?;
        let message_diagnostics = WINDOW_MESSAGE_DIAGNOSTICS
            .lock()
            .expect("Steam overlay window message diagnostics lock poisoned")
            .clone();

        unsafe {
            let foreground = GetForegroundWindow();
            let foreground_thread = if foreground.is_null() {
                0
            } else {
                GetWindowThreadProcessId(foreground, ptr::null_mut())
            };
            let foreground_keyboard_layout = if foreground_thread == 0 {
                None
            } else {
                let layout = GetKeyboardLayout(foreground_thread);
                (!layout.is_null()).then_some(format!("0x{:016X}", layout as usize))
            };
            let keyboard_layout = format!("0x{:016X}", GetKeyboardLayout(0) as usize);
            let rect = read_window_rect(surface.hwnd).map(window_rect_json);
            let client_rect = read_client_rect_in_screen(surface.hwnd);
            let capture = GetCapture();
            let primary_button = if GetSystemMetrics(SM_SWAPBUTTON) != 0 {
                VK_RBUTTON
            } else {
                VK_LBUTTON
            };
            let primary_button_down =
                GetAsyncKeyState(i32::from(primary_button)) as u16 & 0x8000 != 0;
            let mut cursor = POINT { x: 0, y: 0 };
            let pointer = if GetCursorPos(&mut cursor) != 0 {
                let hit_test = read_window_rect(surface.hwnd)
                    .filter(|window| {
                        cursor.x >= window.left
                            && cursor.y >= window.top
                            && cursor.x < window.right
                            && cursor.y < window.bottom
                    })
                    .map(|_| {
                        let packed = (u32::from(cursor.x as i16 as u16)
                            | (u32::from(cursor.y as i16 as u16) << 16))
                            as LPARAM;
                        DefWindowProcW(surface.hwnd, WM_NCHITTEST, 0, packed) as i64
                    });
                json!({
                    "captureHwnd": (!capture.is_null()).then(|| hwnd_hex(capture)),
                    "primaryButtonDown": primary_button_down,
                    "cursorScreen": { "x": cursor.x, "y": cursor.y },
                    "hitTest": hit_test,
                })
            } else {
                json!({
                    "captureHwnd": (!capture.is_null()).then(|| hwnd_hex(capture)),
                    "primaryButtonDown": primary_button_down,
                    "cursorScreen": null,
                    "hitTest": null,
                })
            };
            let window_dpi = dpi_for_window(surface.hwnd).max(96);
            let window_per_monitor_v2 = window_is_per_monitor_v2(surface.hwnd);
            let effective_menu_dpi = surface
                .menu_minimum_dpi
                .map(|minimum_dpi| minimum_dpi.max(window_dpi));
            let mut menu_bar_info: MENUBARINFO = mem::zeroed();
            menu_bar_info.cbSize = mem::size_of::<MENUBARINFO>() as u32;
            let menu_bar_rect =
                if GetMenuBarInfo(surface.hwnd, OBJID_MENU, 0, &mut menu_bar_info) != 0 {
                    Some(window_rect_json(menu_bar_info.rcBar))
                } else {
                    None
                };
            let logical_client_size = client_rect.map(|rect| {
                json!({
                    "width": physical_pixels_to_logical((rect.right - rect.left).max(1), window_dpi),
                    "height": physical_pixels_to_logical((rect.bottom - rect.top).max(1), window_dpi),
                })
            });
            let style = GetWindowLongPtrW(surface.hwnd, GWL_STYLE) as u32;
            let ex_style = GetWindowLongPtrW(surface.hwnd, GWL_EXSTYLE) as u32;
            let renderer = renderer_diagnostics_json(&surface.renderer);
            let display = window_display_diagnostics(surface.hwnd);
            let adopted_steam_dialog = surface.adopted_steam_dialog.as_ref().map(|dialog| {
                json!({
                    "hwnd": hwnd_hex(dialog.hwnd),
                    "processId": dialog.process_id,
                    "ownerHwnd": hwnd_hex(GetWindow(dialog.hwnd, GW_OWNER)),
                    "originalOwnerHwnd": hwnd_hex(dialog.original_owner_hwnd),
                    "rect": read_window_rect(dialog.hwnd).map(window_rect_json),
                    "originalRect": window_rect_json(dialog.original_rect),
                    "lastHostClientRect": window_rect_json(dialog.last_host_client_rect),
                })
            });
            let mut diagnostics = json!({
                "platform": "win32",
                "backend": surface.backend.as_str(),
                "surfaceInstanceGeneration": surface.instance_generation,
                "hostStyle": "standalone",
                "renderer": renderer,
                "hwnd": hwnd_hex(surface.hwnd),
                "parentHwnd": null,
                "foregroundHwnd": hwnd_hex(foreground),
                "isForeground": surface.hwnd == foreground,
                "style": format!("0x{style:08X}"),
                "exStyle": format!("0x{ex_style:08X}"),
                "inputPassthrough": surface.input_passthrough,
                "opaque": surface.opaque,
                "cursorHiddenRequested": surface.cursor_hidden_requested,
                "cursorSuppressed": surface.cursor_suppressed,
                "cursorDisplayCount": surface.cursor_display_count,
                "continuousPresentRequested": surface.continuous_present_requested,
                "fullScreen": surface.full_screen,
                "presentationReady": surface.presentation_ready,
                "requestedVisible": surface.requested_visible,
                "visible": surface.visible,
                "minimized": IsIconic(surface.hwnd) != 0,
                "parentAllowsSurface": surface.requested_visible
                    && !(surface.input_passthrough && !surface.opaque),
                "sourceFrame": surface.source_frame.as_ref().map(|frame| json!({
                    "width": frame.width,
                    "height": frame.height,
                    "bytes": frame.data.len(),
                })),
                "sourceFrameDirty": surface.source_frame_dirty,
                "frame": surface.frame,
                "rect": rect,
                "clientRect": client_rect.map(window_rect_json),
                "windowDpi": window_dpi,
                "logicalClientSize": logical_client_size,
                "minimumClientSize": surface.standalone_min_client_size.map(|(width, height)| json!({
                    "width": width,
                    "height": height,
                })),
                "menuConfigured": surface.menu.is_some(),
                "menuAttached": !GetMenu(surface.hwnd).is_null(),
                "parentRect": null,
                "parentClientRect": null,
                "steamDialog": {
                    "overlayActive": surface.overlay_active,
                    "baselineCount": surface.steam_dialog_baseline.len,
                    "adoptionCount": surface.steam_dialog_adoption_count,
                    "lastAdoptedHwnd": surface.last_adopted_steam_dialog_hwnd.map(hwnd_hex),
                    "adopted": adopted_steam_dialog,
                },
                "messages": message_diagnostics,
            });
            if let Some(object) = diagnostics.as_object_mut() {
                object.insert(
                    "displayWorkAreaClamped".to_owned(),
                    json!(STANDALONE_DISPLAY_CLAMPED.load(Ordering::Relaxed)),
                );
                object.insert(
                    "targetFrameRate".to_owned(),
                    json!(surface.target_frame_rate),
                );
                object.insert("keyboardLayout".to_owned(), json!(keyboard_layout));
                object.insert(
                    "foregroundKeyboardLayout".to_owned(),
                    json!(foreground_keyboard_layout),
                );
                object.insert(
                    "displayDeviceName".to_owned(),
                    json!(display.as_ref().map(|value| &value.device_name)),
                );
                object.insert(
                    "displayRefreshRate".to_owned(),
                    json!(display.as_ref().and_then(|value| value.refresh_rate)),
                );
                object.insert("pointer".to_string(), pointer);
                object.insert(
                    "dpiAwareness".to_owned(),
                    json!({
                        "systemDpi": dpi_for_system().max(96),
                        "windowPerMonitorV2": window_per_monitor_v2,
                    }),
                );
                object.insert(
                    "menuMetrics".to_owned(),
                    json!({
                        "ownerDrawn": !surface.menu_draw_tokens.is_empty(),
                        "minimumScale": surface.menu_minimum_dpi.map(|dpi| f64::from(dpi) / 96.0),
                        "effectiveDpi": effective_menu_dpi,
                        "metricHeight": effective_menu_dpi.map(|dpi| system_metrics_for_dpi(SM_CYMENU, dpi)),
                        "barRect": menu_bar_rect,
                    }),
                );
                object.insert(
                    "windowGeometry".to_owned(),
                    json!(WINDOW_GEOMETRY_DIAGNOSTICS
                        .lock()
                        .expect("Steam overlay window geometry diagnostic lock poisoned")
                        .clone()),
                );
            }
            Some(diagnostics.to_string())
        }
    }

    pub fn drain_input_events_json() -> String {
        let events = mem::take(
            &mut *WINDOW_INPUT_EVENTS
                .lock()
                .expect("Steam overlay window input event lock poisoned"),
        );
        serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_owned())
    }

    fn with_surface(run: impl FnOnce(&mut NativeSurface)) -> Result<(), Error> {
        let mut guard = SURFACE
            .lock()
            .expect("Steam overlay native surface lock poisoned");
        if let Some(surface) = guard.as_mut() {
            run(surface);
        }
        Ok(())
    }

    unsafe fn create_surface(
        title: &str,
        standalone_client_size: Option<(i32, i32)>,
        standalone_min_client_size: Option<(i32, i32)>,
    ) -> Result<NativeSurface, Error> {
        let _dpi_awareness = ThreadDpiAwarenessGuard::per_monitor_v2();
        inherit_foreground_keyboard_layout();
        ensure_window_class()?;
        reset_window_message_diagnostics();
        let title = wide_string(title);
        let class_name = window_class_name();
        let backend = WindowsNativeBackend::from_env();
        let input_passthrough = false;
        let ex_style = base_ex_style();
        let style = WS_OVERLAPPEDWINDOW | WS_CLIPSIBLINGS | WS_CLIPCHILDREN;
        let (x, y, width, height) =
            if let Some((client_width, client_height)) = standalone_client_size {
                let dpi = dpi_for_system().max(96);
                let mut adjusted = RECT {
                    left: 0,
                    top: 0,
                    right: logical_pixels_to_physical(client_width, dpi),
                    bottom: logical_pixels_to_physical(client_height, dpi),
                };
                if adjust_window_rect_ex_for_dpi(&mut adjusted, style, 0, ex_style, dpi) == 0 {
                    return Err(Error::from_reason(
                        "Failed to size the Windows native overlay client area",
                    ));
                }
                let width = (adjusted.right - adjusted.left).max(1);
                let height = (adjusted.bottom - adjusted.top).max(1);
                centered_window_rect(width, height, &primary_work_area())
            } else {
                (100, 100, 960, 540)
            };
        let hwnd = CreateWindowExW(
            ex_style,
            class_name.as_ptr(),
            title.as_ptr(),
            style,
            x,
            y,
            width,
            height,
            ptr::null_mut(),
            ptr::null_mut(),
            GetModuleHandleW(ptr::null()),
            ptr::null_mut(),
        );
        if hwnd.is_null() {
            return Err(Error::from_reason(
                "Failed to create Windows native overlay host window",
            ));
        }
        STANDALONE_WINDOW_DPI.store(dpi_for_window(hwnd).max(96), Ordering::Relaxed);
        let transitions_disabled = 1i32;
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_TRANSITIONS_FORCEDISABLED as u32,
            &transitions_disabled as *const i32 as *const std::ffi::c_void,
            mem::size_of::<i32>() as u32,
        );
        set_window_corner_preference(hwnd, false);

        let renderer = match create_renderer(hwnd, backend, width, height) {
            Ok(renderer) => renderer,
            Err(error) => {
                DestroyWindow(hwnd);
                return Err(error);
            }
        };

        let and_mask = [0xFF_u8; 128];
        let xor_mask = [0_u8; 128];
        let transparent_cursor = CreateCursor(
            GetModuleHandleW(ptr::null()),
            0,
            0,
            32,
            32,
            and_mask.as_ptr().cast(),
            xor_mask.as_ptr().cast(),
        );
        let mut surface = NativeSurface {
            instance_generation: NEXT_SURFACE_INSTANCE_GENERATION
                .fetch_add(1, Ordering::Relaxed)
                .wrapping_add(1),
            hwnd,
            backend,
            renderer,
            frame: 0,
            input_passthrough,
            opaque: true,
            cursor_hidden_requested: false,
            cursor_suppressed: false,
            cursor_display_count: None,
            transparent_cursor,
            continuous_present_requested: false,
            target_frame_rate: None,
            full_screen: false,
            windowed_style: None,
            windowed_placement: None,
            presentation_ready: false,
            requested_visible: true,
            visible: false,
            source_frame: None,
            source_frame_dirty: true,
            last_present_at: None,
            present_after_modal_loop: false,
            modal_size_move_active: false,
            overlay_shortcut_down: false,
            overlay_active: false,
            steam_dialog_baseline: SteamDialogWindowList::default(),
            adopted_steam_dialog: None,
            last_steam_dialog_scan_at: None,
            steam_dialog_adoption_count: 0,
            last_adopted_steam_dialog_hwnd: None,
            standalone_min_client_size,
            menu: None,
            menu_draw_tokens: Vec::new(),
            menu_minimum_dpi: None,
        };
        sync_window_style(&mut surface);
        sync_surface_visibility(&mut surface);
        if surface.visible && !surface.input_passthrough {
            activate_window(&surface);
        }
        Ok(surface)
    }

    unsafe fn render_surface(surface: &mut NativeSurface) -> Result<(), Error> {
        if IsIconic(surface.hwnd) != 0 {
            return Ok(());
        }
        let mut rect: RECT = mem::zeroed();
        if GetClientRect(surface.hwnd, &mut rect) == 0 {
            return Ok(());
        }
        let width = (rect.right - rect.left).max(1);
        let height = (rect.bottom - rect.top).max(1);
        let color = if surface.opaque {
            [0.0, 0.0, 0.0, 1.0]
        } else {
            [0.0, 0.0, 0.0, 0.0]
        };
        let source_frame = surface.source_frame.as_ref();
        let upload_source_frame =
            surface.source_frame_dirty || surface.continuous_present_requested;

        match &mut surface.renderer {
            WindowsSurfaceRenderer::OpenGl { hdc, hglrc } => {
                render_opengl(*hdc, *hglrc, width, height, color)?
            }
            WindowsSurfaceRenderer::D3d11 {
                renderer,
                last_frame_upload,
                frame_upload_failures,
                device_lost,
                device_lost_count,
                ..
            } => {
                if *device_lost {
                    surface.source_frame_dirty = true;
                    return Ok(());
                }
                if let Err(error) = renderer.resize(width as u32, height as u32) {
                    if windows_d3d11::is_device_lost_error(&error) {
                        *device_lost = true;
                        *device_lost_count = (*device_lost_count).saturating_add(1);
                        *last_frame_upload = false;
                        surface.source_frame_dirty = true;
                        return Ok(());
                    }
                    return Err(Error::from_reason(error));
                }
                if upload_source_frame {
                    if let Some(frame) = source_frame {
                        match renderer.upload_cpu_frame(
                            &frame.data,
                            frame.width as u32,
                            frame.height as u32,
                        ) {
                            Ok(()) => *last_frame_upload = true,
                            Err(error) => {
                                *last_frame_upload = false;
                                *frame_upload_failures = frame_upload_failures.saturating_add(1);
                                return Err(Error::from_reason(error));
                            }
                        }
                    }
                }
                match renderer.render(color) {
                    Ok(Some(_)) => {}
                    Ok(None) => {
                        // DXGI is still presenting the previous frame. Retain
                        // the newest source and let the JS scheduler retry
                        // without blocking Electron's main process.
                        surface.source_frame_dirty = true;
                        return Ok(());
                    }
                    Err(error) => {
                        if windows_d3d11::is_device_lost_error(&error) {
                            *device_lost = true;
                            *device_lost_count = (*device_lost_count).saturating_add(1);
                            *last_frame_upload = false;
                            surface.source_frame_dirty = true;
                            return Ok(());
                        }
                        return Err(Error::from_reason(error));
                    }
                }
            }
        }

        surface.frame = surface.frame.wrapping_add(1);
        surface.source_frame_dirty = matches!(
            &surface.renderer,
            WindowsSurfaceRenderer::D3d11 {
                last_frame_upload: false,
                ..
            }
        ) && surface.source_frame.is_some();
        surface.last_present_at = Some(Instant::now());
        let has_required_frame = matches!(&surface.renderer, WindowsSurfaceRenderer::OpenGl { .. })
            || matches!(
                &surface.renderer,
                WindowsSurfaceRenderer::D3d11 { renderer, .. } if renderer.has_source()
            );
        if !surface.presentation_ready && has_required_frame {
            surface.presentation_ready = true;
            apply_window_style(surface);
        }
        Ok(())
    }

    unsafe fn create_renderer(
        hwnd: HWND,
        backend: WindowsNativeBackend,
        width: i32,
        height: i32,
    ) -> Result<WindowsSurfaceRenderer, Error> {
        match backend {
            WindowsNativeBackend::OpenGl => create_opengl_renderer(hwnd),
            WindowsNativeBackend::D3d11 => create_d3d11_renderer(hwnd, width, height),
        }
    }

    unsafe fn create_opengl_renderer(hwnd: HWND) -> Result<WindowsSurfaceRenderer, Error> {
        let hdc = GetDC(hwnd);
        if hdc.is_null() {
            return Err(Error::from_reason(
                "Failed to acquire Windows native overlay device context",
            ));
        }

        let descriptor = pixel_format_descriptor();
        let pixel_format = ChoosePixelFormat(hdc, &descriptor);
        if pixel_format == 0 {
            ReleaseDC(hwnd, hdc);
            return Err(Error::from_reason(
                "Failed to choose Windows native overlay pixel format",
            ));
        }
        if SetPixelFormat(hdc, pixel_format, &descriptor) == 0 {
            ReleaseDC(hwnd, hdc);
            return Err(Error::from_reason(
                "Failed to set Windows native overlay pixel format",
            ));
        }

        let hglrc = wglCreateContext(hdc);
        if hglrc == 0 {
            ReleaseDC(hwnd, hdc);
            return Err(Error::from_reason(
                "Failed to create Windows native overlay OpenGL context",
            ));
        }
        if wglMakeCurrent(hdc, hglrc) == 0 {
            wglDeleteContext(hglrc);
            ReleaseDC(hwnd, hdc);
            return Err(Error::from_reason(
                "Failed to make Windows native overlay OpenGL context current",
            ));
        }

        Ok(WindowsSurfaceRenderer::OpenGl { hdc, hglrc })
    }

    unsafe fn create_d3d11_renderer(
        hwnd: HWND,
        width: i32,
        height: i32,
    ) -> Result<WindowsSurfaceRenderer, Error> {
        Ok(WindowsSurfaceRenderer::D3d11 {
            renderer: WindowsD3d11Renderer::new(
                hwnd.cast(),
                width.max(1) as u32,
                height.max(1) as u32,
            )
            .map_err(Error::from_reason)?,
            last_frame_upload: false,
            frame_upload_failures: 0,
            device_lost: false,
            device_lost_count: 0,
            device_recovery_count: 0,
        })
    }

    unsafe fn render_opengl(
        hdc: HDC,
        hglrc: Hglrc,
        width: i32,
        height: i32,
        color: [f32; 4],
    ) -> Result<(), Error> {
        if wglMakeCurrent(hdc, hglrc) == 0 {
            return Err(Error::from_reason(
                "Failed to make Windows native overlay OpenGL context current",
            ));
        }

        glViewport(0, 0, width, height);
        glClearColor(color[0], color[1], color[2], color[3]);
        glClear(GL_COLOR_BUFFER_BIT);
        SwapBuffers(hdc);
        Ok(())
    }

    unsafe fn release_renderer(renderer: WindowsSurfaceRenderer, hwnd: HWND) {
        match renderer {
            WindowsSurfaceRenderer::OpenGl { hdc, hglrc } => {
                wglMakeCurrent(ptr::null_mut(), 0);
                if hglrc != 0 {
                    wglDeleteContext(hglrc);
                }
                if !hdc.is_null() {
                    ReleaseDC(hwnd, hdc);
                }
            }
            WindowsSurfaceRenderer::D3d11 { .. } => {}
        }
    }

    unsafe fn renderer_diagnostics_json(renderer: &WindowsSurfaceRenderer) -> serde_json::Value {
        match renderer {
            WindowsSurfaceRenderer::OpenGl { .. } => json!({
                "backend": "windows-opengl",
            }),
            WindowsSurfaceRenderer::D3d11 {
                renderer,
                last_frame_upload,
                frame_upload_failures,
                device_lost,
                device_lost_count,
                device_recovery_count,
            } => json!({
                "backend": "windows-d3d11",
                "width": renderer.width(),
                "height": renderer.height(),
                "format": "bgra8-unorm",
                "presentationMode": "flip-sequential",
                "bufferCount": 2,
                "gdiCompatible": false,
                "frameLatencyWaitable": renderer.frame_latency_waitable(),
                "frameLatencyWaitBypassed": renderer.frame_latency_wait_bypassed(),
                "frameLatencyFallbackTimerResolutionRequested": renderer.fallback_timer_resolution_requested(),
                "frameLatencyFallbackTimerResolutionActive": renderer.fallback_timer_resolution_active(),
                "frameLatencyFallbackTimerResolutionMs": if renderer.fallback_timer_resolution_active() { Some(1) } else { None },
                "maximumFrameLatency": 2,
                "presentSyncInterval": renderer.present_sync_interval(),
                "frameLatencyWaitTimeoutCount": renderer.frame_latency_wait_timeout_count(),
                "timing": {
                    "asyncFrameLatencyReadyCount": renderer.async_frame_latency_ready_count(),
                    "frameLatencyNotReadyCount": renderer.frame_latency_not_ready_count(),
                    "lastRenderIntervalMs": renderer.last_render_interval_ms(),
                    "maxRenderIntervalMs": renderer.max_render_interval_ms(),
                    "renderIntervalOver25MsCount": renderer.render_interval_over_25_ms_count(),
                    "renderIntervalOver50MsCount": renderer.render_interval_over_50_ms_count(),
                    "renderIntervalOver100MsCount": renderer.render_interval_over_100_ms_count(),
                    "lastFrameLatencyWaitDurationMs": renderer.last_frame_latency_wait_duration_ms(),
                    "maxFrameLatencyWaitDurationMs": renderer.max_frame_latency_wait_duration_ms(),
                    "frameLatencyWaitOver25MsCount": renderer.frame_latency_wait_over_25_ms_count(),
                    "lastPresentDurationMs": renderer.last_present_duration_ms(),
                    "maxPresentDurationMs": renderer.max_present_duration_ms(),
                    "presentOver25MsCount": renderer.present_over_25_ms_count(),
                    "lastRenderDurationMs": renderer.last_render_duration_ms(),
                    "maxRenderDurationMs": renderer.max_render_duration_ms(),
                    "renderOver25MsCount": renderer.render_over_25_ms_count(),
                    "frameStatisticsAvailable": renderer.frame_statistics_available(),
                    "frameStatisticsPresentCount": renderer.frame_statistics_present_count(),
                    "frameStatisticsRefreshCount": renderer.frame_statistics_refresh_count(),
                    "lastFrameStatisticsPresentDelta": renderer.last_frame_statistics_present_delta(),
                    "lastFrameStatisticsRefreshDelta": renderer.last_frame_statistics_refresh_delta(),
                    "repeatedRefreshCount": renderer.repeated_refresh_count(),
                    "maxRepeatedRefreshesPerSample": renderer.max_repeated_refreshes_per_sample(),
                },
                "sharedTextureCopySlowCount": renderer.shared_texture_copy_slow_count(),
                "sharedTextureCopy": {
                    "completionMode": renderer.shared_texture_copy_completion_mode(),
                    "completedCount": renderer.shared_texture_copy_completed_count(),
                    "submissionFailureCount": renderer.shared_texture_copy_submission_failure_count(),
                    "terminalFailureCount": renderer.shared_texture_copy_terminal_failure_count(),
                    "timeoutCount": renderer.shared_texture_copy_timeout_count(),
                    "fatalTimeoutCount": renderer.shared_texture_copy_fatal_timeout_count(),
                    "lastDispatchDelayMs": renderer.last_shared_texture_copy_dispatch_delay_ms(),
                    "maxDispatchDelayMs": renderer.max_shared_texture_copy_dispatch_delay_ms(),
                    "lastDurationMs": renderer.last_shared_texture_copy_duration_ms(),
                    "maxDurationMs": renderer.max_shared_texture_copy_duration_ms(),
                    "limit": crate::native_overlay_shared_texture_copy_job_limit(),
                    "inFlight": crate::native_overlay_shared_texture_copy_job_count(),
                    "maxInFlight": crate::native_overlay_shared_texture_copy_job_max(),
                    "saturationDropCount": crate::native_overlay_shared_texture_copy_saturation_drop_count(),
                    "rendererInFlight": renderer.shared_texture_copies_in_flight(),
                    "rendererMaxInFlight": renderer.max_shared_texture_copies_in_flight(),
                    "rendererSaturationDropCount": renderer.shared_texture_copy_saturation_drop_count(),
                },
                "sharedTextureFullCopyCount": renderer.shared_texture_full_copy_count(),
                "sharedTexturePartialCopyCount": renderer.shared_texture_partial_copy_count(),
                "sharedTextureStorageRecreateCount": renderer.shared_texture_storage_recreate_count(),
                "lastSharedTextureContentRect": renderer.last_shared_texture_content_rect(),
                "lastSharedTexturePresentationRect": renderer.last_shared_texture_presentation_rect(),
                "featureLevel": format!("0x{:04X}", renderer.feature_level()),
                "adapter": renderer.adapter_name(),
                "lastPresent": format!("0x{:08X}", renderer.last_present() as u32),
                "lastFrameUpload": last_frame_upload,
                "frameUploadFailures": frame_upload_failures,
                "deviceLost": device_lost,
                "deviceLostCount": device_lost_count,
                "deviceRecoveryCount": device_recovery_count,
                "sourceMode": renderer.source_mode(),
                "sourceWidth": renderer.source_width(),
                "sourceHeight": renderer.source_height(),
                "sourceFormat": renderer.source_format(),
                "sourceSampleCount": renderer.source_sample_count(),
                "cpuUploadCount": renderer.cpu_upload_count(),
                "sharedTextureImportCount": renderer.shared_texture_import_count(),
                "repeatedSourcePresents": renderer.repeated_source_present_count(),
                "skippedSourceFrames": renderer.skipped_source_frame_count(),
            }),
        }
    }

    unsafe fn sync_steam_dialog(surface: &mut NativeSurface) {
        if !surface.overlay_active {
            restore_adopted_steam_dialog(surface);
            return;
        }

        if let Some(dialog) = surface.adopted_steam_dialog.as_mut() {
            if IsWindow(dialog.hwnd) == 0 || GetWindow(dialog.hwnd, GW_OWNER) != surface.hwnd {
                surface.adopted_steam_dialog = None;
                return;
            }
            sync_adopted_steam_dialog_position(surface.hwnd, dialog);
            return;
        }

        if surface
            .last_steam_dialog_scan_at
            .is_some_and(|last_scan_at| last_scan_at.elapsed() < STEAM_DIALOG_SCAN_INTERVAL)
        {
            return;
        }
        surface.last_steam_dialog_scan_at = Some(Instant::now());

        let candidates = enumerate_steam_dialog_windows();
        for &hwnd in &candidates.hwnds[..candidates.len] {
            if surface.steam_dialog_baseline.contains(hwnd) {
                continue;
            }
            let Some(dialog) = adopt_steam_dialog(surface.hwnd, hwnd) else {
                continue;
            };
            surface.steam_dialog_adoption_count =
                surface.steam_dialog_adoption_count.saturating_add(1);
            surface.last_adopted_steam_dialog_hwnd = Some(hwnd);
            surface.adopted_steam_dialog = Some(dialog);
            break;
        }
    }

    unsafe fn enumerate_steam_dialog_windows() -> SteamDialogWindowList {
        let mut windows = SteamDialogWindowList::default();
        EnumWindows(
            Some(collect_steam_dialog_window),
            &mut windows as *mut SteamDialogWindowList as LPARAM,
        );
        windows
    }

    unsafe extern "system" fn collect_steam_dialog_window(hwnd: HWND, lparam: LPARAM) -> i32 {
        if !is_matching_steam_dialog(hwnd) {
            return 1;
        }
        let windows = &mut *(lparam as *mut SteamDialogWindowList);
        if windows.len < windows.hwnds.len() {
            windows.hwnds[windows.len] = hwnd;
            windows.len += 1;
        }
        1
    }

    unsafe fn is_matching_steam_dialog(hwnd: HWND) -> bool {
        if hwnd.is_null()
            || IsWindow(hwnd) == 0
            || IsWindowVisible(hwnd) == 0
            || !GetWindow(hwnd, GW_OWNER).is_null()
            || !window_text_equals_ascii(hwnd, "Steam Dialog")
            || !window_class_equals_ascii(hwnd, "SDL_app")
        {
            return false;
        }

        let mut process_id = 0u32;
        GetWindowThreadProcessId(hwnd, &mut process_id);
        process_id != 0 && process_image_basename_equals(process_id, "steamwebhelper.exe")
    }

    unsafe fn window_text_equals_ascii(hwnd: HWND, expected: &str) -> bool {
        let mut buffer = [0u16; 64];
        let length = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
        length > 0 && wide_equals_ascii(&buffer[..length as usize], expected, false)
    }

    unsafe fn window_class_equals_ascii(hwnd: HWND, expected: &str) -> bool {
        let mut buffer = [0u16; 64];
        let length = GetClassNameW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
        length > 0 && wide_equals_ascii(&buffer[..length as usize], expected, false)
    }

    unsafe fn process_image_basename_equals(process_id: u32, expected: &str) -> bool {
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
        if process.is_null() {
            return false;
        }
        let mut buffer = [0u16; 1024];
        let mut length = buffer.len() as u32;
        let queried = QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut length) != 0;
        CloseHandle(process);
        if !queried || length == 0 {
            return false;
        }
        let path = &buffer[..length as usize];
        let basename_start = path
            .iter()
            .rposition(|value| matches!(*value, 47 | 92))
            .map_or(0, |index| index + 1);
        wide_equals_ascii(&path[basename_start..], expected, true)
    }

    fn wide_equals_ascii(value: &[u16], expected: &str, ignore_ascii_case: bool) -> bool {
        let expected = expected.as_bytes();
        value.len() == expected.len()
            && value.iter().zip(expected).all(|(&actual, &expected)| {
                if ignore_ascii_case {
                    ascii_lower_u16(actual) == ascii_lower_u16(expected as u16)
                } else {
                    actual == expected as u16
                }
            })
    }

    fn ascii_lower_u16(value: u16) -> u16 {
        if (b'A' as u16..=b'Z' as u16).contains(&value) {
            value + (b'a' - b'A') as u16
        } else {
            value
        }
    }

    unsafe fn adopt_steam_dialog(host_hwnd: HWND, dialog_hwnd: HWND) -> Option<AdoptedSteamDialog> {
        if !is_matching_steam_dialog(dialog_hwnd) {
            return None;
        }
        let original_rect = read_window_rect(dialog_hwnd)?;
        let host_client_rect = read_client_rect_in_screen(host_hwnd)?;
        let mut process_id = 0u32;
        GetWindowThreadProcessId(dialog_hwnd, &mut process_id);

        SetLastError(0);
        let original_owner_hwnd =
            SetWindowLongPtrW(dialog_hwnd, GWLP_HWNDPARENT, host_hwnd as isize) as HWND;
        if original_owner_hwnd.is_null() && GetLastError() != 0 {
            return None;
        }

        let (x, y) = centered_dialog_position(host_hwnd, host_client_rect, original_rect);
        if SetWindowPos(
            dialog_hwnd,
            ptr::null_mut(),
            x,
            y,
            0,
            0,
            SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOSIZE | SWP_NOZORDER,
        ) == 0
        {
            SetWindowLongPtrW(dialog_hwnd, GWLP_HWNDPARENT, original_owner_hwnd as isize);
            return None;
        }

        Some(AdoptedSteamDialog {
            hwnd: dialog_hwnd,
            process_id,
            original_owner_hwnd,
            original_rect,
            last_host_client_rect: host_client_rect,
        })
    }

    unsafe fn sync_adopted_steam_dialog_position(host_hwnd: HWND, dialog: &mut AdoptedSteamDialog) {
        if IsIconic(host_hwnd) != 0 || IsWindowVisible(host_hwnd) == 0 {
            return;
        }
        let Some(host_client_rect) = read_client_rect_in_screen(host_hwnd) else {
            return;
        };
        if rect_equals(host_client_rect, dialog.last_host_client_rect) {
            return;
        }
        let Some(dialog_rect) = read_window_rect(dialog.hwnd) else {
            return;
        };
        let host_size_changed = rect_width(host_client_rect)
            != rect_width(dialog.last_host_client_rect)
            || rect_height(host_client_rect) != rect_height(dialog.last_host_client_rect);
        let (x, y) = if host_size_changed {
            centered_dialog_position(host_hwnd, host_client_rect, dialog_rect)
        } else {
            clamp_dialog_position(
                host_hwnd,
                dialog_rect.left + host_client_rect.left - dialog.last_host_client_rect.left,
                dialog_rect.top + host_client_rect.top - dialog.last_host_client_rect.top,
                rect_width(dialog_rect),
                rect_height(dialog_rect),
            )
        };
        if SetWindowPos(
            dialog.hwnd,
            ptr::null_mut(),
            x,
            y,
            0,
            0,
            SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOSIZE | SWP_NOZORDER,
        ) != 0
        {
            dialog.last_host_client_rect = host_client_rect;
        }
    }

    unsafe fn restore_adopted_steam_dialog(surface: &mut NativeSurface) {
        let Some(dialog) = surface.adopted_steam_dialog.take() else {
            return;
        };
        if IsWindow(dialog.hwnd) == 0 || GetWindow(dialog.hwnd, GW_OWNER) != surface.hwnd {
            return;
        }
        SetWindowLongPtrW(
            dialog.hwnd,
            GWLP_HWNDPARENT,
            dialog.original_owner_hwnd as isize,
        );
        SetWindowPos(
            dialog.hwnd,
            ptr::null_mut(),
            dialog.original_rect.left,
            dialog.original_rect.top,
            rect_width(dialog.original_rect),
            rect_height(dialog.original_rect),
            SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER,
        );
    }

    unsafe fn centered_dialog_position(
        host_hwnd: HWND,
        host_rect: RECT,
        dialog_rect: RECT,
    ) -> (i32, i32) {
        let width = rect_width(dialog_rect);
        let height = rect_height(dialog_rect);
        clamp_dialog_position(
            host_hwnd,
            host_rect.left + (rect_width(host_rect) - width) / 2,
            host_rect.top + (rect_height(host_rect) - height) / 2,
            width,
            height,
        )
    }

    unsafe fn clamp_dialog_position(
        host_hwnd: HWND,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
    ) -> (i32, i32) {
        let monitor = MonitorFromWindow(host_hwnd, MONITOR_DEFAULTTONEAREST);
        let mut monitor_info: MONITORINFO = mem::zeroed();
        monitor_info.cbSize = mem::size_of::<MONITORINFO>() as u32;
        if monitor.is_null() || GetMonitorInfoW(monitor, &mut monitor_info) == 0 {
            return (x, y);
        }
        let work = monitor_info.rcWork;
        (
            x.clamp(work.left, (work.right - width).max(work.left)),
            y.clamp(work.top, (work.bottom - height).max(work.top)),
        )
    }

    fn rect_equals(left: RECT, right: RECT) -> bool {
        left.left == right.left
            && left.top == right.top
            && left.right == right.right
            && left.bottom == right.bottom
    }

    fn rect_width(rect: RECT) -> i32 {
        (rect.right - rect.left).max(1)
    }

    fn rect_height(rect: RECT) -> i32 {
        (rect.bottom - rect.top).max(1)
    }

    unsafe fn hide_window_without_activation(hwnd: HWND) {
        SetWindowPos(
            hwnd,
            ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_HIDEWINDOW
                | SWP_NOMOVE
                | SWP_NOSIZE
                | SWP_NOZORDER
                | SWP_NOOWNERZORDER
                | SWP_NOACTIVATE,
        );
    }

    unsafe fn sync_surface_visibility(surface: &mut NativeSurface) {
        let should_be_visible =
            surface.requested_visible && !(surface.input_passthrough && !surface.opaque);
        if should_be_visible == surface.visible {
            return;
        }
        if should_be_visible {
            surface.presentation_ready = false;
            apply_window_style(surface);
            let command = if surface.input_passthrough {
                SW_SHOWNOACTIVATE
            } else {
                SW_SHOW
            };
            ShowWindow(surface.hwnd, command);
        } else {
            hide_window_without_activation(surface.hwnd);
            surface.presentation_ready = false;
        }
        surface.visible = should_be_visible;
        if should_be_visible && !surface.input_passthrough {
            activate_window(surface);
        }
    }

    unsafe fn sync_window_style(surface: &mut NativeSurface) {
        apply_window_style(surface);
        sync_surface_visibility(surface);
    }

    unsafe fn apply_window_style(surface: &mut NativeSurface) {
        let mut ex_style = GetWindowLongPtrW(surface.hwnd, GWL_EXSTYLE) as u32;
        ex_style &= !(WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TOPMOST);
        // Keep the presenter transparent until it has copied and presented a
        // fresh Electron frame. Once ready, it is a normal opaque game window;
        // Steam then composites over the copied game pixels in its swapchain.
        if surface.opaque && surface.presentation_ready {
            ex_style &= !WS_EX_LAYERED;
        } else {
            ex_style |= WS_EX_LAYERED;
        }
        if surface.input_passthrough {
            ex_style |= WS_EX_TRANSPARENT;
        } else {
            ex_style &= !WS_EX_TRANSPARENT;
        }
        SetWindowLongPtrW(surface.hwnd, GWL_EXSTYLE, ex_style as isize);
        let mut flags =
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED;
        if surface.input_passthrough {
            flags |= SWP_NOACTIVATE;
        }
        SetWindowPos(surface.hwnd, ptr::null_mut(), 0, 0, 0, 0, flags);
        if ex_style & WS_EX_LAYERED != 0 {
            SetLayeredWindowAttributes(surface.hwnd, 0, 0, LWA_ALPHA);
        }
    }

    unsafe fn set_window_corner_preference(hwnd: HWND, full_screen: bool) {
        let corner_preference = if full_screen {
            DWMWCP_DONOTROUND
        } else {
            DWMWCP_ROUND
        };
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE as u32,
            &corner_preference as *const i32 as *const std::ffi::c_void,
            mem::size_of::<i32>() as u32,
        );
    }

    unsafe fn activate_window(surface: &NativeSurface) {
        SetForegroundWindow(surface.hwnd);
        SetActiveWindow(surface.hwnd);
        SetFocus(surface.hwnd);
    }

    unsafe fn inherit_foreground_keyboard_layout() {
        let foreground = GetForegroundWindow();
        if foreground.is_null() {
            return;
        }
        let foreground_thread = GetWindowThreadProcessId(foreground, ptr::null_mut());
        if foreground_thread == 0 {
            return;
        }
        let foreground_layout = GetKeyboardLayout(foreground_thread);
        if foreground_layout.is_null() || foreground_layout == GetKeyboardLayout(0) {
            return;
        }
        // Keyboard layouts are thread-local on Windows. The standalone Steam
        // host becomes the application's focused window, so inherit the layout
        // that was active immediately before the host is created instead of
        // silently reverting players to this process thread's default layout.
        ActivateKeyboardLayout(foreground_layout, 0);
    }

    unsafe fn destroy_surface(mut surface: NativeSurface) {
        restore_adopted_steam_dialog(&mut surface);
        if surface.cursor_suppressed {
            normalize_cursor_display_count(true);
        }
        if let Some(menu) = surface.menu.take() {
            SetMenu(surface.hwnd, ptr::null_mut());
            DestroyMenu(menu);
        }
        unregister_menu_draw_items(&surface.menu_draw_tokens);
        release_renderer(surface.renderer, surface.hwnd);
        if !surface.hwnd.is_null() {
            DestroyWindow(surface.hwnd);
        }
        if !surface.transparent_cursor.is_null() {
            DestroyCursor(surface.transparent_cursor);
        }
        set_standalone_min_client_size(None);
        set_standalone_logical_client_size(None);
        STANDALONE_DISPLAY_CLAMPED.store(false, Ordering::Relaxed);
        *WINDOW_GEOMETRY_DIAGNOSTICS
            .lock()
            .expect("Steam overlay window geometry diagnostic lock poisoned") = None;
        STANDALONE_WINDOW_DPI.store(96, Ordering::Relaxed);
    }

    unsafe fn surface_needs_render(surface: &NativeSurface) -> bool {
        if surface.source_frame_dirty || !surface.presentation_ready {
            return true;
        }

        // The DXGI frame-latency waitable object is the cadence boundary for the
        // D3D11 host. Continuous presentation keeps the retained frame eligible;
        // new Electron frames also arrive through the immediate update path.
        if surface.continuous_present_requested {
            // New game frames drive presentation. Do not spend a ready slot on
            // an old texture just before the next Chromium frame arrives.
            // Steam still gets regular Presents over genuinely idle content,
            // and the open overlay keeps the full display cadence.
            return surface.overlay_active || surface.last_present_at.is_none_or(|last| {
                last.elapsed() >= std::time::Duration::from_millis(20)
            });
        }

        // Some desktop-capture paths stop exposing an idle legacy swapchain
        // even though its source bitmap has not changed. Refresh the retained
        // frame at a deliberately low cadence; active Electron paint still
        // drives the real display-rate path.
        if surface.source_frame.is_some()
            && surface.last_present_at.is_none_or(|last_present_at| {
                last_present_at.elapsed() >= RETAINED_FRAME_REFRESH_INTERVAL
            })
        {
            return true;
        }

        match &surface.renderer {
            WindowsSurfaceRenderer::OpenGl { .. } => true,
            WindowsSurfaceRenderer::D3d11 { renderer, .. } => {
                let mut rect: RECT = mem::zeroed();
                GetClientRect(surface.hwnd, &mut rect) != 0
                    && (renderer.width() != (rect.right - rect.left).max(1) as u32
                        || renderer.height() != (rect.bottom - rect.top).max(1) as u32)
            }
        }
    }

    unsafe fn sync_cursor_visibility(surface: &mut NativeSurface) {
        let should_suppress = surface.cursor_hidden_requested
            && surface.visible
            && surface_has_foreground(surface)
            && cursor_is_in_client(surface.hwnd);

        if should_suppress != surface.cursor_suppressed {
            surface.cursor_display_count = Some(normalize_cursor_display_count(!should_suppress));
            surface.cursor_suppressed = should_suppress;
        }
        if should_suppress {
            SetCursor(surface.transparent_cursor);
        }
    }

    unsafe fn sync_cursor_for_window_message(hwnd: HWND) -> bool {
        let Ok(mut guard) = SURFACE.try_lock() else {
            return false;
        };
        let Some(surface) = guard.as_mut().filter(|surface| surface.hwnd == hwnd) else {
            return false;
        };
        sync_cursor_visibility(surface);
        if !surface.cursor_suppressed {
            return false;
        }
        SetCursor(surface.transparent_cursor);
        true
    }

    unsafe fn normalize_cursor_display_count(visible: bool) -> i32 {
        let mut display_count = ShowCursor(if visible { 1 } else { 0 });
        for _ in 0..32 {
            if (visible && display_count >= 0) || (!visible && display_count < 0) {
                break;
            }
            display_count = ShowCursor(if visible { 1 } else { 0 });
        }
        display_count
    }

    unsafe fn surface_has_foreground(surface: &NativeSurface) -> bool {
        GetForegroundWindow() == surface.hwnd
    }

    unsafe fn poll_overlay_shortcut(surface: &mut NativeSurface) {
        let tab_state = async_key_state(VK_TAB_CODE);
        let shift_state = async_key_state(VK_SHIFT_CODE)
            | async_key_state(VK_LEFT_SHIFT_CODE)
            | async_key_state(VK_RIGHT_SHIFT_CODE);
        let has_foreground = surface_has_foreground(surface);
        let shortcut_down = has_foreground && tab_state & 0x8000 != 0 && shift_state & 0x8000 != 0;
        let shortcut_signaled =
            has_foreground && tab_state & 0x8001 != 0 && shift_state & 0x8001 != 0;
        if shortcut_signaled && !surface.overlay_shortcut_down {
            record_overlay_shortcut(surface.hwnd);
        }
        surface.overlay_shortcut_down = shortcut_down;
    }

    unsafe fn async_key_state(virtual_key: i32) -> u16 {
        GetAsyncKeyState(virtual_key) as u16
    }

    unsafe fn cursor_is_in_client(hwnd: HWND) -> bool {
        let mut point: POINT = mem::zeroed();
        if GetCursorPos(&mut point) == 0 || ScreenToClient(hwnd, &mut point) == 0 {
            return false;
        }
        let mut rect: RECT = mem::zeroed();
        GetClientRect(hwnd, &mut rect) != 0
            && point.x >= rect.left
            && point.y >= rect.top
            && point.x < rect.right
            && point.y < rect.bottom
    }

    unsafe fn pump_messages(hwnd: HWND) {
        let mut message: MSG = mem::zeroed();
        while PeekMessageW(&mut message, hwnd, 0, 0, PM_REMOVE) != 0 {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    }

    unsafe fn render_retained_frame_from_window_message(
        hwnd: HWND,
        present_after_modal_loop: bool,
        allow_during_modal_size_move: bool,
    ) {
        let Ok(mut guard) = SURFACE.try_lock() else {
            return;
        };
        let Some(surface) = guard
            .as_mut()
            .filter(|surface| surface.hwnd == hwnd && surface.visible)
        else {
            return;
        };
        surface.present_after_modal_loop |= present_after_modal_loop;
        if surface.modal_size_move_active && !allow_during_modal_size_move {
            surface.source_frame_dirty = true;
            return;
        }
        if render_surface(surface).is_err() {
            // The ordinary pump owns error teardown. Keep the retained frame
            // dirty so it retries immediately after the modal sizing loop.
            surface.source_frame_dirty = true;
        }
    }

    unsafe fn set_modal_size_move_active(hwnd: HWND, active: bool) {
        let Ok(mut guard) = SURFACE.try_lock() else {
            return;
        };
        let Some(surface) = guard.as_mut().filter(|surface| surface.hwnd == hwnd) else {
            return;
        };
        surface.modal_size_move_active = active;
        if !active {
            surface.present_after_modal_loop = true;
        }
    }

    fn dpi_scaled(value: i32, dpi: u32) -> i32 {
        ((i64::from(value) * i64::from(dpi.max(96)) + 48) / 96).clamp(1, i64::from(i32::MAX)) as i32
    }

    unsafe fn with_menu_font<T>(dpi: u32, run: impl FnOnce(isize) -> T) -> T {
        let mut metrics: NONCLIENTMETRICSW = mem::zeroed();
        metrics.cbSize = mem::size_of::<NONCLIENTMETRICSW>() as u32;
        let font = if system_parameters_info_for_dpi(
            SPI_GETNONCLIENTMETRICS,
            metrics.cbSize,
            &mut metrics as *mut NONCLIENTMETRICSW as *mut std::ffi::c_void,
            0,
            dpi,
        ) != 0
        {
            CreateFontIndirectW(&metrics.lfMenuFont) as isize
        } else {
            0
        };
        let owns_font = font != 0;
        let font = if owns_font {
            font
        } else {
            GetStockObject(DEFAULT_GUI_FONT) as isize
        };
        let result = run(font);
        if owns_font {
            DeleteObject(font as *mut std::ffi::c_void);
        }
        result
    }

    unsafe fn menu_text_extent(hdc: HDC, text: &[u16]) -> SIZE {
        let mut size: SIZE = mem::zeroed();
        if !text.is_empty() {
            GetTextExtentPoint32W(hdc, text.as_ptr(), text.len() as i32, &mut size);
        }
        size
    }

    fn split_menu_text(text: &[u16]) -> (&[u16], &[u16]) {
        match text.iter().position(|value| *value == b'\t' as u16) {
            Some(index) => (&text[..index], &text[index + 1..]),
            None => (text, &[]),
        }
    }

    unsafe fn measure_native_menu_item(hwnd: HWND, measure: &mut MEASUREITEMSTRUCT) -> bool {
        if measure.CtlType != ODT_MENU || measure.itemData == 0 {
            return false;
        }
        let Some(item) = read_menu_draw_item(measure.itemData) else {
            return false;
        };
        let dpi = dpi_for_window(hwnd).max(96).max(item.minimum_dpi);
        if item.separator {
            measure.itemWidth = dpi_scaled(8, dpi) as u32;
            measure.itemHeight = dpi_scaled(7, dpi) as u32;
            return true;
        }

        let hdc = GetDC(hwnd);
        if hdc.is_null() {
            return false;
        }
        let (left_text, accelerator_text) = split_menu_text(&item.measure_label);
        let (left_size, accelerator_size) = with_menu_font(dpi, |font| {
            let previous = SelectObject(hdc, font as *mut std::ffi::c_void);
            let sizes = (
                menu_text_extent(hdc, left_text),
                menu_text_extent(hdc, accelerator_text),
            );
            if !previous.is_null() {
                SelectObject(hdc, previous);
            }
            sizes
        });
        ReleaseDC(hwnd, hdc);

        let horizontal_padding = dpi_scaled(if item.top_level { 8 } else { 6 }, dpi);
        let vertical_padding = dpi_scaled(3, dpi);
        let text_height = left_size.cy.max(accelerator_size.cy).max(1);
        let item_height =
            system_metrics_for_dpi(SM_CYMENU, dpi).max(text_height + vertical_padding * 2);
        let item_width = if item.top_level {
            left_size.cx + horizontal_padding * 2
        } else {
            let check_width = system_metrics_for_dpi(SM_CXMENUCHECK, dpi).max(dpi_scaled(12, dpi));
            let arrow_width = system_metrics_for_dpi(SM_CXMENUSIZE, dpi).max(dpi_scaled(12, dpi));
            check_width
                + left_size.cx
                + if accelerator_text.is_empty() {
                    0
                } else {
                    dpi_scaled(24, dpi) + accelerator_size.cx
                }
                + arrow_width
                + horizontal_padding * 4
        };
        measure.itemWidth = item_width.max(1) as u32;
        measure.itemHeight = item_height.max(1) as u32;
        true
    }

    unsafe fn draw_native_menu_item(hwnd: HWND, draw: &DRAWITEMSTRUCT) -> bool {
        if draw.CtlType != ODT_MENU || draw.itemData == 0 || draw.hDC.is_null() {
            return false;
        }
        let Some(item) = read_menu_draw_item(draw.itemData) else {
            return false;
        };
        let dpi = dpi_for_window(hwnd).max(96).max(item.minimum_dpi);
        let selected = draw.itemState & ODS_SELECTED != 0;
        let disabled = draw.itemState & (ODS_DISABLED | ODS_GRAYED) != 0;
        let background_color = if selected {
            COLOR_HIGHLIGHT
        } else if item.top_level {
            COLOR_MENUBAR
        } else {
            COLOR_MENU
        };
        FillRect(draw.hDC, &draw.rcItem, GetSysColorBrush(background_color));

        if item.separator {
            let mut line = draw.rcItem;
            let center = line.top + (line.bottom - line.top) / 2;
            line.left += dpi_scaled(18, dpi);
            line.right -= dpi_scaled(6, dpi);
            line.top = center;
            line.bottom = center + 1;
            FillRect(draw.hDC, &line, GetSysColorBrush(COLOR_GRAYTEXT));
            return true;
        }

        let text_color = if disabled {
            COLOR_GRAYTEXT
        } else if selected {
            COLOR_HIGHLIGHTTEXT
        } else {
            COLOR_MENUTEXT
        };
        SetBkMode(draw.hDC, TRANSPARENT as i32);
        SetTextColor(draw.hDC, GetSysColor(text_color));
        let horizontal_padding = dpi_scaled(if item.top_level { 8 } else { 6 }, dpi);
        let check_width = if item.top_level {
            0
        } else {
            system_metrics_for_dpi(SM_CXMENUCHECK, dpi).max(dpi_scaled(12, dpi))
        };
        let arrow_width = if item.top_level {
            0
        } else {
            system_metrics_for_dpi(SM_CXMENUSIZE, dpi).max(dpi_scaled(12, dpi))
        };
        let (left_text, accelerator_text) = split_menu_text(&item.label);
        let mut format = DT_SINGLELINE | DT_VCENTER;
        if draw.itemState & ODS_NOACCEL != 0 {
            format |= DT_HIDEPREFIX;
        }

        with_menu_font(dpi, |font| {
            let previous = SelectObject(draw.hDC, font as *mut std::ffi::c_void);
            let mut left_rect = draw.rcItem;
            left_rect.left += horizontal_padding + check_width;
            left_rect.right -= horizontal_padding + arrow_width;
            DrawTextW(
                draw.hDC,
                left_text.as_ptr(),
                left_text.len() as i32,
                &mut left_rect,
                format | DT_LEFT,
            );
            if !accelerator_text.is_empty() {
                let mut accelerator_rect = left_rect;
                accelerator_rect.left += dpi_scaled(24, dpi);
                DrawTextW(
                    draw.hDC,
                    accelerator_text.as_ptr(),
                    accelerator_text.len() as i32,
                    &mut accelerator_rect,
                    format | DT_RIGHT,
                );
            }
            if !previous.is_null() {
                SelectObject(draw.hDC, previous);
            }
        });

        if item.submenu && !item.top_level {
            let mut arrow_rect = draw.rcItem;
            arrow_rect.left = arrow_rect.right - arrow_width - horizontal_padding;
            arrow_rect.right -= horizontal_padding;
            let arrow_size = system_metrics_for_dpi(SM_CYMENUSIZE, dpi)
                .max(dpi_scaled(12, dpi))
                .min((arrow_rect.bottom - arrow_rect.top).max(1));
            let center = arrow_rect.top + (arrow_rect.bottom - arrow_rect.top) / 2;
            arrow_rect.top = center - arrow_size / 2;
            arrow_rect.bottom = arrow_rect.top + arrow_size;
            DrawFrameControl(
                draw.hDC,
                &mut arrow_rect,
                DFC_MENU,
                DFCS_MENUARROW | if disabled { DFCS_INACTIVE } else { 0 },
            );
        }
        true
    }

    unsafe extern "system" fn window_proc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        record_window_message(hwnd, message, wparam, lparam);
        record_window_input(hwnd, message, wparam, lparam);
        if message == WM_MEASUREITEM && lparam != 0 {
            let measure = &mut *(lparam as *mut MEASUREITEMSTRUCT);
            if measure_native_menu_item(hwnd, measure) {
                return 1;
            }
        }
        if message == WM_DRAWITEM && lparam != 0 {
            let draw = &*(lparam as *const DRAWITEMSTRUCT);
            if draw_native_menu_item(hwnd, draw) {
                return 1;
            }
        }
        if matches!(
            message,
            WM_LBUTTONDOWN | WM_RBUTTONDOWN | WM_MBUTTONDOWN | WM_XBUTTONDOWN
        ) {
            SetCapture(hwnd);
        }
        if matches!(
            message,
            WM_LBUTTONUP | WM_RBUTTONUP | WM_MBUTTONUP | WM_XBUTTONUP
        ) && (wparam as u32 & (MK_LBUTTON | MK_RBUTTON | MK_MBUTTON | MK_XBUTTON1 | MK_XBUTTON2))
            == 0
            && GetCapture() == hwnd
        {
            ReleaseCapture();
        }
        if message == WM_CANCELMODE && GetCapture() == hwnd {
            ReleaseCapture();
        }
        if matches!(message, WM_XBUTTONDOWN | WM_XBUTTONUP) {
            // The application consumed buttons 4/5. Returning TRUE prevents
            // DefWindowProc from converting them into browser navigation.
            return 1;
        }
        if message == WM_GETMINMAXINFO && lparam != 0 {
            if let Some((width, height)) = minimum_window_track_size(hwnd) {
                let min_max_info = &mut *(lparam as *mut MINMAXINFO);
                min_max_info.ptMinTrackSize.x = min_max_info.ptMinTrackSize.x.max(width);
                min_max_info.ptMinTrackSize.y = min_max_info.ptMinTrackSize.y.max(height);
                return 0;
            }
        }
        if message == WM_CLOSE {
            ShowWindow(hwnd, SW_HIDE);
            return 0;
        }
        if message == WM_MOUSEACTIVATE
            && GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32 & WS_EX_NOACTIVATE != 0
        {
            return MA_NOACTIVATE as LRESULT;
        }
        if message == WM_SETCURSOR && sync_cursor_for_window_message(hwnd) {
            return 1;
        }
        if message == WM_ERASEBKGND {
            render_retained_frame_from_window_message(hwnd, false, false);
            return 1;
        }
        if message == WM_SIZE && wparam != SIZE_MINIMIZED as usize {
            render_retained_frame_from_window_message(hwnd, false, false);
        }
        if message == WM_DPICHANGED && lparam != 0 {
            let new_dpi = (wparam as u32 & 0xffff).max(96);
            let previous_dpi = STANDALONE_WINDOW_DPI
                .swap(new_dpi, Ordering::Relaxed)
                .max(96);
            // GetDpiForWindow and owner-drawn menu metrics can already reflect
            // the new DPI before WM_DPICHANGED reaches this procedure. Reading
            // the client rect here therefore loses pixels from the old logical
            // viewport. Keep the last normal logical client size separately so
            // a DPI transition cannot reinterpret new non-client metrics as a
            // user resize.
            let logical_client_size = standalone_logical_client_size().or_else(|| {
                read_client_rect(hwnd).map(|client| {
                    (
                        physical_pixels_to_logical(
                            (client.right - client.left).max(1),
                            previous_dpi,
                        ),
                        physical_pixels_to_logical(
                            (client.bottom - client.top).max(1),
                            previous_dpi,
                        ),
                    )
                })
            });
            let suggested = &*(lparam as *const RECT);
            let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
            if IsZoomed(hwnd) == 0 && style & WS_OVERLAPPEDWINDOW != 0 {
                if let Some((logical_width, logical_height)) = logical_client_size {
                    let minimum_physical_client =
                        standalone_min_client_size().map(|(minimum_width, minimum_height)| {
                            (
                                logical_pixels_to_physical(minimum_width, new_dpi),
                                logical_pixels_to_physical(minimum_height, new_dpi),
                            )
                        });
                    let draw_menu_bar_result = DrawMenuBar(hwnd) != 0;
                    if resize_window_for_client_size(
                        hwnd,
                        suggested.left,
                        suggested.top,
                        logical_pixels_to_physical(logical_width, new_dpi),
                        logical_pixels_to_physical(logical_height, new_dpi),
                        Some((logical_width, logical_height)),
                        minimum_physical_client,
                        Some(new_dpi),
                        "dpi-change",
                        Some(draw_menu_bar_result),
                    )
                    .is_err()
                    {
                        SetWindowPos(
                            hwnd,
                            ptr::null_mut(),
                            suggested.left,
                            suggested.top,
                            (suggested.right - suggested.left).max(1),
                            (suggested.bottom - suggested.top).max(1),
                            SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER,
                        );
                    }
                } else {
                    SetWindowPos(
                        hwnd,
                        ptr::null_mut(),
                        suggested.left,
                        suggested.top,
                        (suggested.right - suggested.left).max(1),
                        (suggested.bottom - suggested.top).max(1),
                        SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER,
                    );
                }
            } else {
                SetWindowPos(
                    hwnd,
                    ptr::null_mut(),
                    suggested.left,
                    suggested.top,
                    (suggested.right - suggested.left).max(1),
                    (suggested.bottom - suggested.top).max(1),
                    SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER,
                );
            }
            render_retained_frame_from_window_message(hwnd, true, false);
            return 0;
        }
        if matches!(message, WM_DISPLAYCHANGE | WM_SETTINGCHANGE) {
            reconcile_standalone_window_with_work_area(hwnd);
            render_retained_frame_from_window_message(hwnd, true, false);
        }
        if message == WM_ENTERSIZEMOVE {
            // DefWindowProc owns a nested modal loop while a top-level window is
            // moved or resized. The ordinary JS-driven pump is blocked during
            // that loop, so keep capture/composition alive from a window timer.
            set_modal_size_move_active(hwnd, true);
            SetTimer(
                hwnd,
                MODAL_PRESENT_TIMER_ID,
                MODAL_PRESENT_INTERVAL_MS,
                None,
            );
            render_retained_frame_from_window_message(hwnd, true, false);
        }
        if message == WM_TIMER && wparam == MODAL_PRESENT_TIMER_ID {
            render_retained_frame_from_window_message(hwnd, false, true);
            return 0;
        }
        if message == WM_EXITSIZEMOVE {
            KillTimer(hwnd, MODAL_PRESENT_TIMER_ID);
            set_modal_size_move_active(hwnd, false);
            remember_standalone_logical_client_size(hwnd);
            STANDALONE_DISPLAY_CLAMPED.store(false, Ordering::Relaxed);
            render_retained_frame_from_window_message(hwnd, true, true);
        }
        if message == WM_MOVE {
            render_retained_frame_from_window_message(hwnd, false, false);
        }
        if message == WM_PAINT {
            let mut paint: PAINTSTRUCT = mem::zeroed();
            BeginPaint(hwnd, &mut paint);
            render_retained_frame_from_window_message(hwnd, false, false);
            EndPaint(hwnd, &paint);
            return 0;
        }
        DefWindowProcW(hwnd, message, wparam, lparam)
    }

    unsafe fn ensure_window_class() -> Result<(), Error> {
        WINDOW_CLASS_RESULT
            .get_or_init(|| register_window_class().map_err(|error| error.to_owned()))
            .clone()
            .map_err(Error::from_reason)
    }

    unsafe fn register_window_class() -> Result<(), &'static str> {
        let class_name = window_class_name();
        let window_class = WNDCLASSW {
            style: CS_OWNDC,
            lpfnWndProc: Some(window_proc),
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: GetModuleHandleW(ptr::null()),
            hIcon: ptr::null_mut(),
            hCursor: LoadCursorW(ptr::null_mut(), IDC_ARROW),
            hbrBackground: ptr::null_mut(),
            lpszMenuName: ptr::null(),
            lpszClassName: class_name.as_ptr(),
        };

        if RegisterClassW(&window_class) == 0 {
            return Err("Failed to register Windows native overlay window class");
        }
        Ok(())
    }

    fn pixel_format_descriptor() -> PIXELFORMATDESCRIPTOR {
        PIXELFORMATDESCRIPTOR {
            nSize: mem::size_of::<PIXELFORMATDESCRIPTOR>() as u16,
            nVersion: 1,
            dwFlags: PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER,
            iPixelType: PFD_TYPE_RGBA,
            cColorBits: 32,
            cRedBits: 0,
            cRedShift: 0,
            cGreenBits: 0,
            cGreenShift: 0,
            cBlueBits: 0,
            cBlueShift: 0,
            cAlphaBits: 8,
            cAlphaShift: 0,
            cAccumBits: 0,
            cAccumRedBits: 0,
            cAccumGreenBits: 0,
            cAccumBlueBits: 0,
            cAccumAlphaBits: 0,
            cDepthBits: 24,
            cStencilBits: 8,
            cAuxBuffers: 0,
            iLayerType: PFD_MAIN_PLANE as u8,
            bReserved: 0,
            dwLayerMask: 0,
            dwVisibleMask: 0,
            dwDamageMask: 0,
        }
    }

    fn read_window_rect(hwnd: HWND) -> Option<RECT> {
        unsafe {
            let mut rect: RECT = mem::zeroed();
            if GetWindowRect(hwnd, &mut rect) == 0 {
                return None;
            }
            Some(rect)
        }
    }

    fn read_client_rect(hwnd: HWND) -> Option<RECT> {
        unsafe {
            let mut rect: RECT = mem::zeroed();
            if GetClientRect(hwnd, &mut rect) == 0 {
                return None;
            }
            Some(rect)
        }
    }

    fn read_client_rect_in_screen(hwnd: HWND) -> Option<RECT> {
        unsafe {
            let rect = read_client_rect(hwnd)?;

            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;
            let mut origin = POINT {
                x: rect.left,
                y: rect.top,
            };
            if ClientToScreen(hwnd, &mut origin) == 0 {
                return None;
            }

            Some(RECT {
                left: origin.x,
                top: origin.y,
                right: origin.x + width,
                bottom: origin.y + height,
            })
        }
    }

    fn base_ex_style() -> u32 {
        WS_EX_LAYERED
    }

    fn reset_window_message_diagnostics() {
        *WINDOW_MESSAGE_DIAGNOSTICS
            .lock()
            .expect("Steam overlay window message diagnostics lock poisoned") =
            WindowMessageDiagnostics::default();
        WINDOW_INPUT_EVENTS
            .lock()
            .expect("Steam overlay window input event lock poisoned")
            .clear();
    }

    fn record_overlay_shortcut(hwnd: HWND) {
        let client = read_client_rect(hwnd).unwrap_or(RECT {
            left: 0,
            top: 0,
            right: 1,
            bottom: 1,
        });
        let event = WindowInputEvent {
            kind: "overlayShortcut",
            captured_at_ms: now_ms(),
            message: 0,
            wparam: 0,
            lparam: 0,
            shift: true,
            control: false,
            alt: false,
            caps_lock: unsafe { lock_key_toggled(VK_CAPS_LOCK_CODE) },
            num_lock: unsafe { lock_key_toggled(VK_NUM_LOCK_CODE) },
            x: None,
            y: None,
            delta_x: None,
            delta_y: None,
            command_id: None,
            client_width: (client.right - client.left).max(1),
            client_height: (client.bottom - client.top).max(1),
            minimized: unsafe { IsIconic(hwnd) != 0 },
        };
        let mut events = WINDOW_INPUT_EVENTS
            .lock()
            .expect("Steam overlay window input event lock poisoned");
        events.push(event);
        if events.len() > 256 {
            events.remove(0);
        }
    }

    fn record_window_input(hwnd: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) {
        let kind = match message {
            WM_MOUSEMOVE => "mouseMove",
            WM_LBUTTONDOWN => "leftMouseDown",
            WM_LBUTTONUP => "leftMouseUp",
            WM_RBUTTONDOWN => "rightMouseDown",
            WM_RBUTTONUP => "rightMouseUp",
            WM_MBUTTONDOWN => "middleMouseDown",
            WM_MBUTTONUP => "middleMouseUp",
            WM_XBUTTONDOWN if ((wparam as u32 >> 16) & u16::MAX as u32) == 1 => "backMouseDown",
            WM_XBUTTONUP if ((wparam as u32 >> 16) & u16::MAX as u32) == 1 => "backMouseUp",
            WM_XBUTTONDOWN => "forwardMouseDown",
            WM_XBUTTONUP => "forwardMouseUp",
            WM_MOUSEWHEEL | WM_MOUSEHWHEEL => "mouseWheel",
            WM_KEYDOWN | WM_SYSKEYDOWN => "keyDown",
            WM_KEYUP | WM_SYSKEYUP => "keyUp",
            WM_CHAR => "char",
            WM_SETFOCUS => "focus",
            WM_KILLFOCUS => "blur",
            WM_CAPTURECHANGED | WM_CANCELMODE => "captureLost",
            WM_COMMAND => "menuCommand",
            WM_CLOSE => "close",
            WM_MOVE | WM_SIZE => "windowChanged",
            _ => return,
        };
        let (x, y) = if matches!(message, WM_MOUSEWHEEL | WM_MOUSEHWHEEL) {
            let packed = lparam as u32;
            let mut point = POINT {
                x: (packed as u16 as i16) as i32,
                y: ((packed >> 16) as u16 as i16) as i32,
            };
            if unsafe { ScreenToClient(hwnd, &mut point) } != 0 {
                (Some(point.x), Some(point.y))
            } else {
                (None, None)
            }
        } else if matches!(
            message,
            WM_MOUSEMOVE
                | WM_LBUTTONDOWN
                | WM_LBUTTONUP
                | WM_RBUTTONDOWN
                | WM_RBUTTONUP
                | WM_MBUTTONDOWN
                | WM_MBUTTONUP
                | WM_XBUTTONDOWN
                | WM_XBUTTONUP
        ) {
            let packed = lparam as u32;
            (
                Some((packed as u16 as i16) as i32),
                Some(((packed >> 16) as u16 as i16) as i32),
            )
        } else {
            (None, None)
        };
        let client = read_client_rect(hwnd).unwrap_or(RECT {
            left: 0,
            top: 0,
            right: 1,
            bottom: 1,
        });
        let event = WindowInputEvent {
            kind,
            captured_at_ms: now_ms(),
            message,
            wparam: wparam as u64,
            lparam: lparam as i64,
            shift: unsafe {
                modifier_key_down(&[VK_SHIFT_CODE, VK_LEFT_SHIFT_CODE, VK_RIGHT_SHIFT_CODE])
            },
            control: unsafe {
                modifier_key_down(&[VK_CONTROL_CODE, VK_LEFT_CONTROL_CODE, VK_RIGHT_CONTROL_CODE])
            },
            alt: unsafe { modifier_key_down(&[VK_ALT_CODE, VK_LEFT_ALT_CODE, VK_RIGHT_ALT_CODE]) },
            caps_lock: unsafe { lock_key_toggled(VK_CAPS_LOCK_CODE) },
            num_lock: unsafe { lock_key_toggled(VK_NUM_LOCK_CODE) },
            x,
            y,
            delta_x: (message == WM_MOUSEHWHEEL)
                .then_some(((wparam as u32 >> 16) as u16 as i16) as i32),
            delta_y: (message == WM_MOUSEWHEEL)
                .then_some(((wparam as u32 >> 16) as u16 as i16) as i32),
            command_id: (message == WM_COMMAND).then_some(wparam as u32 & u16::MAX as u32),
            client_width: (client.right - client.left).max(1),
            client_height: (client.bottom - client.top).max(1),
            minimized: (message == WM_SIZE && wparam == SIZE_MINIMIZED as usize)
                || unsafe { IsIconic(hwnd) != 0 },
        };
        let mut events = WINDOW_INPUT_EVENTS
            .lock()
            .expect("Steam overlay window input event lock poisoned");
        if matches!(message, WM_MOUSEMOVE | WM_MOVE | WM_SIZE)
            && events.last().is_some_and(|last| last.kind == kind)
        {
            *events.last_mut().expect("input event disappeared") = event;
        } else {
            events.push(event);
        }
        if events.len() > 256 {
            events.remove(0);
        }
    }

    fn record_window_message(hwnd: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) {
        let name = window_message_name(message);
        let mut diagnostics = WINDOW_MESSAGE_DIAGNOSTICS
            .lock()
            .expect("Steam overlay window message diagnostics lock poisoned");
        diagnostics.counters.total = diagnostics.counters.total.saturating_add(1);
        match message {
            WM_KEYDOWN => {
                diagnostics.counters.key_down = diagnostics.counters.key_down.saturating_add(1)
            }
            WM_KEYUP => diagnostics.counters.key_up = diagnostics.counters.key_up.saturating_add(1),
            WM_SYSKEYDOWN => {
                diagnostics.counters.sys_key_down =
                    diagnostics.counters.sys_key_down.saturating_add(1)
            }
            WM_SYSKEYUP => {
                diagnostics.counters.sys_key_up = diagnostics.counters.sys_key_up.saturating_add(1)
            }
            WM_MOUSEMOVE => {
                diagnostics.counters.mouse_move = diagnostics.counters.mouse_move.saturating_add(1)
            }
            WM_LBUTTONDOWN => {
                diagnostics.counters.left_button_down =
                    diagnostics.counters.left_button_down.saturating_add(1)
            }
            WM_LBUTTONUP => {
                diagnostics.counters.left_button_up =
                    diagnostics.counters.left_button_up.saturating_add(1)
            }
            WM_CLOSE => diagnostics.counters.close = diagnostics.counters.close.saturating_add(1),
            WM_SETFOCUS => {
                diagnostics.counters.set_focus = diagnostics.counters.set_focus.saturating_add(1)
            }
            WM_KILLFOCUS => {
                diagnostics.counters.kill_focus = diagnostics.counters.kill_focus.saturating_add(1)
            }
            WM_ACTIVATE => {
                diagnostics.counters.activate = diagnostics.counters.activate.saturating_add(1)
            }
            WM_ACTIVATEAPP => {
                diagnostics.counters.activate_app =
                    diagnostics.counters.activate_app.saturating_add(1)
            }
            WM_MOUSEACTIVATE => {
                diagnostics.counters.mouse_activate =
                    diagnostics.counters.mouse_activate.saturating_add(1)
            }
            WM_COMMAND => {
                diagnostics.counters.command = diagnostics.counters.command.saturating_add(1);
            }
            WM_NCHITTEST => {
                diagnostics.counters.nc_hit_test =
                    diagnostics.counters.nc_hit_test.saturating_add(1);
            }
            WM_NCLBUTTONDOWN => {
                diagnostics.counters.nc_left_button_down =
                    diagnostics.counters.nc_left_button_down.saturating_add(1);
            }
            WM_NCLBUTTONUP => {
                diagnostics.counters.nc_left_button_up =
                    diagnostics.counters.nc_left_button_up.saturating_add(1);
            }
            WM_SYSCOMMAND => {
                diagnostics.counters.system_command =
                    diagnostics.counters.system_command.saturating_add(1);
            }
            WM_ENTERSIZEMOVE => {
                diagnostics.counters.enter_size_move =
                    diagnostics.counters.enter_size_move.saturating_add(1);
            }
            WM_EXITSIZEMOVE => {
                diagnostics.counters.exit_size_move =
                    diagnostics.counters.exit_size_move.saturating_add(1);
            }
            WM_CAPTURECHANGED => {
                diagnostics.counters.capture_changed =
                    diagnostics.counters.capture_changed.saturating_add(1);
            }
            _ => {}
        }

        if is_diagnostic_window_message(message) {
            diagnostics.recent.push(WindowMessageEvent {
                at_ms: now_ms(),
                hwnd: hwnd_hex(hwnd),
                message,
                name,
                wparam: wparam as u64,
                lparam: lparam as i64,
            });
            if diagnostics.recent.len() > 64 {
                diagnostics.recent.remove(0);
            }
        }
    }

    fn is_diagnostic_window_message(message: u32) -> bool {
        matches!(
            message,
            WM_KEYDOWN
                | WM_KEYUP
                | WM_SYSKEYDOWN
                | WM_SYSKEYUP
                | WM_LBUTTONDOWN
                | WM_LBUTTONUP
                | WM_CLOSE
                | WM_SETFOCUS
                | WM_KILLFOCUS
                | WM_ACTIVATE
                | WM_ACTIVATEAPP
                | WM_MOUSEACTIVATE
                | WM_COMMAND
                | WM_NCHITTEST
                | WM_NCLBUTTONDOWN
                | WM_NCLBUTTONUP
                | WM_SYSCOMMAND
                | WM_ENTERSIZEMOVE
                | WM_EXITSIZEMOVE
                | WM_CAPTURECHANGED
        )
    }

    fn window_message_name(message: u32) -> &'static str {
        match message {
            WM_KEYDOWN => "WM_KEYDOWN",
            WM_KEYUP => "WM_KEYUP",
            WM_SYSKEYDOWN => "WM_SYSKEYDOWN",
            WM_SYSKEYUP => "WM_SYSKEYUP",
            WM_MOUSEMOVE => "WM_MOUSEMOVE",
            WM_LBUTTONDOWN => "WM_LBUTTONDOWN",
            WM_LBUTTONUP => "WM_LBUTTONUP",
            WM_CLOSE => "WM_CLOSE",
            WM_SETFOCUS => "WM_SETFOCUS",
            WM_KILLFOCUS => "WM_KILLFOCUS",
            WM_ACTIVATE => "WM_ACTIVATE",
            WM_ACTIVATEAPP => "WM_ACTIVATEAPP",
            WM_MOUSEACTIVATE => "WM_MOUSEACTIVATE",
            WM_COMMAND => "WM_COMMAND",
            WM_NCHITTEST => "WM_NCHITTEST",
            WM_NCLBUTTONDOWN => "WM_NCLBUTTONDOWN",
            WM_NCLBUTTONUP => "WM_NCLBUTTONUP",
            WM_SYSCOMMAND => "WM_SYSCOMMAND",
            WM_ENTERSIZEMOVE => "WM_ENTERSIZEMOVE",
            WM_EXITSIZEMOVE => "WM_EXITSIZEMOVE",
            WM_CAPTURECHANGED => "WM_CAPTURECHANGED",
            _ => "other",
        }
    }

    fn window_rect_json(rect: RECT) -> serde_json::Value {
        json!({
            "left": rect.left,
            "top": rect.top,
            "right": rect.right,
            "bottom": rect.bottom,
            "width": (rect.right - rect.left).max(0),
            "height": (rect.bottom - rect.top).max(0),
        })
    }

    fn hwnd_hex(hwnd: HWND) -> String {
        format!("0x{:X}", hwnd as usize)
    }

    fn now_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
            .unwrap_or(0)
    }

    unsafe fn modifier_key_down(virtual_keys: &[i32]) -> bool {
        virtual_keys
            .iter()
            .any(|virtual_key| async_key_state(*virtual_key) & 0x8000 != 0)
    }

    unsafe fn lock_key_toggled(virtual_key: i32) -> bool {
        GetKeyState(virtual_key) as u16 & 0x0001 != 0
    }

    fn minimum_menu_dpi(scale: f64) -> Result<u32, Error> {
        if !scale.is_finite() || !(1.0..=4.0).contains(&scale) {
            return Err(Error::from_reason(
                "Native overlay host minimum menu scale must be between 1 and 4",
            ));
        }
        Ok((scale * 96.0).round().clamp(96.0, 384.0) as u32)
    }

    fn menu_text_without_mnemonics(label: &str) -> Vec<u16> {
        let mut text = String::with_capacity(label.len());
        let mut characters = label.chars().peekable();
        while let Some(character) = characters.next() {
            if character == '&' {
                if characters.peek() == Some(&'&') {
                    text.push('&');
                    characters.next();
                }
                continue;
            }
            text.push(character);
        }
        text.encode_utf16().collect()
    }

    fn register_menu_draw_item(item: NativeMenuDrawItem) -> usize {
        let mut accessible_text = if item.separator {
            Vec::new().into_boxed_slice()
        } else {
            let mut text = item.measure_label.clone();
            text.push(0);
            text.into_boxed_slice()
        };
        let mut data = Box::new(NativeMenuOwnerDrawData {
            msaa: MSAAMENUINFO {
                dwMSAASignature: MSAA_MENU_SIG as u32,
                cchWText: accessible_text.len().saturating_sub(1) as u32,
                pszWText: if accessible_text.is_empty() {
                    ptr::null_mut()
                } else {
                    accessible_text.as_mut_ptr()
                },
            },
            draw: item,
            _accessible_text: accessible_text,
        });
        let token = ptr::addr_of_mut!(data.msaa) as usize;
        MENU_DRAW_ITEMS
            .lock()
            .expect("Steam overlay menu draw item lock poisoned")
            .insert(token, data);
        token
    }

    fn unregister_menu_draw_items(tokens: &[usize]) {
        if tokens.is_empty() {
            return;
        }
        let mut items = MENU_DRAW_ITEMS
            .lock()
            .expect("Steam overlay menu draw item lock poisoned");
        for token in tokens {
            items.remove(token);
        }
    }

    fn read_menu_draw_item(token: usize) -> Option<NativeMenuDrawItem> {
        MENU_DRAW_ITEMS
            .lock()
            .ok()?
            .get(&token)
            .map(|data| data.draw.clone())
    }

    unsafe fn build_native_menu(
        items: &[NativeMenuItem],
        popup: bool,
        minimum_dpi: Option<u32>,
        draw_tokens: &mut Vec<usize>,
    ) -> Result<HMENU, Error> {
        let menu = if popup {
            CreatePopupMenu()
        } else {
            CreateMenu()
        };
        if menu.is_null() {
            return Err(Error::from_reason(
                "Failed to create the native overlay host menu",
            ));
        }

        for (position, item) in items.iter().enumerate() {
            if !item.separator && item.label.is_empty() {
                DestroyMenu(menu);
                return Err(Error::from_reason(
                    "Native overlay host menu labels cannot be empty",
                ));
            }
            if let Some(minimum_dpi) = minimum_dpi {
                let submenu = if item.items.is_empty() {
                    None
                } else {
                    match build_native_menu(&item.items, true, Some(minimum_dpi), draw_tokens) {
                        Ok(submenu) => Some(submenu),
                        Err(error) => {
                            DestroyMenu(menu);
                            return Err(error);
                        }
                    }
                };
                let label = item.label.encode_utf16().collect::<Vec<_>>();
                let token = register_menu_draw_item(NativeMenuDrawItem {
                    measure_label: menu_text_without_mnemonics(&item.label),
                    label,
                    top_level: !popup,
                    submenu: submenu.is_some(),
                    separator: item.separator,
                    minimum_dpi,
                });
                draw_tokens.push(token);
                let mut info: MENUITEMINFOW = mem::zeroed();
                info.cbSize = mem::size_of::<MENUITEMINFOW>() as u32;
                info.fMask = MIIM_FTYPE | MIIM_STATE | MIIM_DATA;
                info.fType = MFT_OWNERDRAW | if item.separator { MFT_SEPARATOR } else { 0 };
                info.fState = if item.enabled {
                    MFS_ENABLED
                } else {
                    MFS_DISABLED
                };
                info.dwItemData = token;
                let submenu_handle = submenu.unwrap_or(ptr::null_mut());
                if !submenu_handle.is_null() {
                    info.fMask |= MIIM_SUBMENU;
                    info.hSubMenu = submenu_handle;
                } else if !item.separator {
                    let Some(command_id) = item
                        .command_id
                        .filter(|value| (1..=u16::MAX as u32).contains(value))
                    else {
                        DestroyMenu(menu);
                        return Err(Error::from_reason(
                            "Native overlay host menu command IDs must be between 1 and 65535",
                        ));
                    };
                    info.fMask |= MIIM_ID;
                    info.wID = command_id;
                }
                if !item.separator {
                    let mut accessible_label = wide_string(&item.label);
                    info.fMask |= MIIM_STRING;
                    info.dwTypeData = accessible_label.as_mut_ptr();
                    info.cch = accessible_label.len().saturating_sub(1) as u32;
                    if InsertMenuItemW(menu, position as u32, 1, &info) == 0 {
                        if !submenu_handle.is_null() {
                            DestroyMenu(submenu_handle);
                        }
                        DestroyMenu(menu);
                        return Err(Error::from_reason(
                            "Failed to append an owner-drawn native overlay host menu item",
                        ));
                    }
                } else if InsertMenuItemW(menu, position as u32, 1, &info) == 0 {
                    if !submenu_handle.is_null() {
                        DestroyMenu(submenu_handle);
                    }
                    DestroyMenu(menu);
                    return Err(Error::from_reason(
                        "Failed to append an owner-drawn native overlay host menu item",
                    ));
                }
                continue;
            }

            if item.separator {
                if AppendMenuW(menu, MF_SEPARATOR, 0, ptr::null()) == 0 {
                    DestroyMenu(menu);
                    return Err(Error::from_reason(
                        "Failed to append a native overlay host menu separator",
                    ));
                }
                continue;
            }
            let label = wide_string(&item.label);
            let enabled_flag = if item.enabled { 0 } else { MF_GRAYED };
            if !item.items.is_empty() {
                let submenu = match build_native_menu(&item.items, true, None, draw_tokens) {
                    Ok(submenu) => submenu,
                    Err(error) => {
                        DestroyMenu(menu);
                        return Err(error);
                    }
                };
                if AppendMenuW(
                    menu,
                    MF_STRING | MF_POPUP | enabled_flag,
                    submenu as usize,
                    label.as_ptr(),
                ) == 0
                {
                    DestroyMenu(submenu);
                    DestroyMenu(menu);
                    return Err(Error::from_reason(
                        "Failed to append a native overlay host submenu",
                    ));
                }
                continue;
            }

            let Some(command_id) = item
                .command_id
                .filter(|value| (1..=u16::MAX as u32).contains(value))
            else {
                DestroyMenu(menu);
                return Err(Error::from_reason(
                    "Native overlay host menu command IDs must be between 1 and 65535",
                ));
            };
            if AppendMenuW(
                menu,
                MF_STRING | enabled_flag,
                command_id as usize,
                label.as_ptr(),
            ) == 0
            {
                DestroyMenu(menu);
                return Err(Error::from_reason(
                    "Failed to append a native overlay host menu command",
                ));
            }
        }
        Ok(menu)
    }

    unsafe fn set_window_menu_attached(surface: &NativeSurface, attached: bool) -> bool {
        let menu = if attached {
            surface.menu.unwrap_or(ptr::null_mut())
        } else {
            ptr::null_mut()
        };
        if GetMenu(surface.hwnd) == menu {
            return true;
        }
        SetMenu(surface.hwnd, menu) != 0 && DrawMenuBar(surface.hwnd) != 0
    }

    unsafe fn restore_previous_menu_and_geometry(
        hwnd: HWND,
        previous_menu: HMENU,
        previous_outer: RECT,
        candidate_menu: HMENU,
    ) -> MenuRollbackResult {
        let mut menu_restored = GetMenu(hwnd) == previous_menu;
        if !menu_restored {
            SetMenu(hwnd, previous_menu);
            menu_restored = GetMenu(hwnd) == previous_menu;
        }
        if !menu_restored && !candidate_menu.is_null() && GetMenu(hwnd) == candidate_menu {
            // A failed operation must never destroy an HMENU that is still
            // attached to the HWND. Detach first, then make one final bounded
            // attempt to restore the previous menu.
            SetMenu(hwnd, ptr::null_mut());
            if !previous_menu.is_null() {
                SetMenu(hwnd, previous_menu);
            }
            menu_restored = GetMenu(hwnd) == previous_menu;
        }
        let candidate_detached = candidate_menu.is_null() || GetMenu(hwnd) != candidate_menu;
        let menu_drawn = menu_restored && DrawMenuBar(hwnd) != 0;
        let geometry_restored =
            positive_rect_size(previous_outer).is_some_and(|(width, height)| {
                SetWindowPos(
                    hwnd,
                    ptr::null_mut(),
                    previous_outer.left,
                    previous_outer.top,
                    width,
                    height,
                    SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED,
                ) != 0
            });
        MenuRollbackResult {
            menu_restored,
            menu_drawn,
            geometry_restored,
            candidate_detached,
            candidate_adopted_for_safety: false,
        }
    }

    unsafe fn rollback_failed_menu_transaction(
        surface: &mut NativeSurface,
        previous_attached_menu: HMENU,
        previous_outer: RECT,
        candidate_menu: Option<HMENU>,
        candidate_draw_tokens: Vec<usize>,
        candidate_minimum_dpi: Option<u32>,
    ) -> MenuRollbackResult {
        let candidate_handle = candidate_menu.unwrap_or(ptr::null_mut());
        let mut result = restore_previous_menu_and_geometry(
            surface.hwnd,
            previous_attached_menu,
            previous_outer,
            candidate_handle,
        );
        if result.candidate_detached {
            if let Some(menu) = candidate_menu {
                DestroyMenu(menu);
            }
            unregister_menu_draw_items(&candidate_draw_tokens);
            return result;
        }

        // The only safe fallback after both bounded rollback attempts fail is
        // to keep owning the still-attached candidate. This is not a successful
        // transaction commit: the API still returns an error, but the HWND can
        // continue dispatching owner-draw messages without a dangling HMENU or
        // token pointer and normal surface teardown will release it exactly once.
        if let Some(candidate) = candidate_menu {
            let previous_menu = surface.menu.replace(candidate);
            let previous_draw_tokens =
                mem::replace(&mut surface.menu_draw_tokens, candidate_draw_tokens);
            surface.menu_minimum_dpi = candidate_minimum_dpi;
            if let Some(previous) = previous_menu {
                if previous != candidate {
                    DestroyMenu(previous);
                }
            }
            unregister_menu_draw_items(&previous_draw_tokens);
            result.candidate_adopted_for_safety = true;
        } else {
            unregister_menu_draw_items(&candidate_draw_tokens);
        }
        result
    }

    fn rect_from_position_size(x: i32, y: i32, width: i32, height: i32) -> Option<RECT> {
        if width <= 0 || height <= 0 {
            return None;
        }
        Some(RECT {
            left: x,
            top: y,
            right: x.checked_add(width)?,
            bottom: y.checked_add(height)?,
        })
    }

    fn positive_rect_size(rect: RECT) -> Option<(i32, i32)> {
        let width = rect.right.checked_sub(rect.left)?;
        let height = rect.bottom.checked_sub(rect.top)?;
        (width > 0 && height > 0).then_some((width, height))
    }

    fn clamp_outer_rect_to_work_area(rect: RECT, work: RECT) -> Option<OuterClampPlan> {
        let (requested_width, requested_height) = positive_rect_size(rect)?;
        let (work_width, work_height) = positive_rect_size(work)?;
        let width = requested_width.min(work_width);
        let height = requested_height.min(work_height);
        let width_clamped = width != requested_width;
        let height_clamped = height != requested_height;
        let max_left = work.right.checked_sub(width)?;
        let max_top = work.bottom.checked_sub(height)?;
        let left = rect.left.clamp(work.left, max_left);
        let top = rect.top.clamp(work.top, max_top);
        let position_clamped = left != rect.left || top != rect.top;
        Some(OuterClampPlan {
            rect: rect_from_position_size(left, top, width, height)?,
            width_clamped,
            height_clamped,
            position_clamped,
        })
    }

    fn geometry_residual(
        requested_width: i32,
        requested_height: i32,
        actual_width: i32,
        actual_height: i32,
    ) -> GeometryResidual {
        GeometryResidual {
            width: requested_width.saturating_sub(actual_width),
            height: requested_height.saturating_sub(actual_height),
        }
    }

    #[cfg(test)]
    fn residual_within_tolerance(residual: GeometryResidual) -> bool {
        residual_axis_within_tolerance(residual.width)
            && residual_axis_within_tolerance(residual.height)
    }

    fn residual_axis_within_tolerance(residual: i32) -> bool {
        residual.unsigned_abs() <= 2
    }

    fn residual_requires_correction(clamp: OuterClampPlan, residual: GeometryResidual) -> bool {
        (!clamp.width_clamped && !residual_axis_within_tolerance(residual.width))
            || (!clamp.height_clamped && !residual_axis_within_tolerance(residual.height))
    }

    fn apply_menu_wrap_estimate(mut adjusted: RECT, nc_calc_client_top: i32) -> Option<RECT> {
        adjusted.bottom = adjusted.bottom.checked_add(nc_calc_client_top)?;
        positive_rect_size(adjusted)?;
        Some(adjusted)
    }

    fn geometry_satisfies_constraints(
        actual_client: (i32, i32),
        minimum_client: Option<(i32, i32)>,
        width_clamped: bool,
        height_clamped: bool,
        residual: GeometryResidual,
    ) -> bool {
        if let Some((minimum_width, minimum_height)) = minimum_client {
            if actual_client.0 < minimum_width || actual_client.1 < minimum_height {
                return false;
            }
        }
        (width_clamped || residual_axis_within_tolerance(residual.width))
            && (height_clamped || residual_axis_within_tolerance(residual.height))
    }

    fn corrected_outer_size(
        requested_client: (i32, i32),
        actual_outer: (i32, i32),
        actual_client: (i32, i32),
        width_clamped: bool,
        height_clamped: bool,
    ) -> Option<(i32, i32)> {
        let non_client_width = actual_outer.0.checked_sub(actual_client.0)?;
        let non_client_height = actual_outer.1.checked_sub(actual_client.1)?;
        if non_client_width < 0 || non_client_height < 0 {
            return None;
        }
        Some((
            if width_clamped {
                actual_outer.0
            } else {
                requested_client.0.checked_add(non_client_width)?
            },
            if height_clamped {
                actual_outer.1
            } else {
                requested_client.1.checked_add(non_client_height)?
            },
        ))
    }

    fn minimum_track_outer_size(
        adjusted: RECT,
        menu_client_top: Option<i32>,
    ) -> Option<(i32, i32)> {
        let menu_aware = match menu_client_top {
            Some(client_top) => apply_menu_wrap_estimate(adjusted, client_top)?,
            None => adjusted,
        };
        positive_rect_size(menu_aware)
    }

    fn record_window_geometry_diagnostics(diagnostics: WindowGeometryDiagnostics) {
        *WINDOW_GEOMETRY_DIAGNOSTICS
            .lock()
            .expect("Steam overlay window geometry diagnostic lock poisoned") = Some(diagnostics);
    }

    #[allow(clippy::too_many_arguments)]
    unsafe fn record_menu_transaction_failure(
        hwnd: HWND,
        dpi: u32,
        desired_logical_client: Option<(i32, i32)>,
        requested_physical_client: (i32, i32),
        minimum_physical_client: Option<(i32, i32)>,
        pre_outer: RECT,
        pre_client: RECT,
        draw_menu_bar_result: Option<bool>,
        reason: &'static str,
    ) -> String {
        let requested_client = (
            requested_physical_client.0.max(1),
            requested_physical_client.1.max(1),
        );
        let mut adjusted = RECT {
            left: 0,
            top: 0,
            right: requested_client.0,
            bottom: requested_client.1,
        };
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let has_menu = i32::from(!GetMenu(hwnd).is_null());
        if adjust_window_rect_ex_for_dpi(&mut adjusted, style, has_menu, ex_style, dpi) == 0 {
            adjusted = RECT {
                left: 0,
                top: 0,
                right: requested_client.0,
                bottom: requested_client.1,
            };
        }
        let adjust_estimate = adjusted;
        if has_menu != 0 {
            let mut nc_calc_probe = adjusted;
            nc_calc_probe.bottom = 0x7fff;
            SendMessageW(
                hwnd,
                WM_NCCALCSIZE,
                0,
                &mut nc_calc_probe as *mut RECT as LPARAM,
            );
            if let Some(wrapped) = apply_menu_wrap_estimate(adjusted, nc_calc_probe.top) {
                adjusted = wrapped;
            }
        }
        let nc_calc_estimate = adjusted;
        let preferred_outer = positive_rect_size(adjusted)
            .and_then(|(width, height)| {
                rect_from_position_size(pre_outer.left, pre_outer.top, width, height)
            })
            .unwrap_or(pre_outer);
        let monitor = MonitorFromRect(&preferred_outer, MONITOR_DEFAULTTONEAREST);
        let mut monitor_info: MONITORINFO = mem::zeroed();
        monitor_info.cbSize = mem::size_of::<MONITORINFO>() as u32;
        let work_area = if !monitor.is_null()
            && GetMonitorInfoW(monitor, &mut monitor_info) != 0
            && positive_rect_size(monitor_info.rcWork).is_some()
        {
            monitor_info.rcWork
        } else {
            pre_outer
        };
        let clamp_plan =
            clamp_outer_rect_to_work_area(preferred_outer, work_area).unwrap_or(OuterClampPlan {
                rect: pre_outer,
                width_clamped: false,
                height_clamped: false,
                position_clamped: false,
            });
        let final_outer = read_window_rect(hwnd);
        let final_client = read_client_rect(hwnd);
        let final_residual = final_client
            .and_then(positive_rect_size)
            .map(|(width, height)| {
                geometry_residual(requested_client.0, requested_client.1, width, height)
            });
        let diagnostics = WindowGeometryDiagnostics {
            operation: "menu-change",
            dpi,
            window_per_monitor_v2: window_is_per_monitor_v2(hwnd),
            style,
            ex_style,
            menu_attached: has_menu != 0,
            desired_logical_client: desired_logical_client
                .map(|(width, height)| GeometrySize { width, height }),
            requested_physical_client: GeometrySize {
                width: requested_client.0,
                height: requested_client.1,
            },
            minimum_physical_client: minimum_physical_client
                .map(|(width, height)| GeometrySize { width, height }),
            pre_outer: pre_outer.into(),
            pre_client: pre_client.into(),
            work_area: work_area.into(),
            adjust_window_rect_estimate: adjust_estimate.into(),
            nc_calc_size_estimate: nc_calc_estimate.into(),
            candidate_outer: clamp_plan.rect.into(),
            final_outer: final_outer.map(Into::into),
            final_client: final_client.map(Into::into),
            clamp_reason: clamp_plan.reason(),
            correction_count: 0,
            final_residual,
            draw_menu_bar_result,
            success: false,
            error: Some(reason.to_owned()),
        };
        let compact = diagnostics.compact();
        record_window_geometry_diagnostics(diagnostics);
        compact
    }

    fn geometry_failure(mut diagnostics: WindowGeometryDiagnostics, reason: &'static str) -> Error {
        diagnostics.success = false;
        diagnostics.error = Some(reason.to_owned());
        let compact = diagnostics.compact();
        record_window_geometry_diagnostics(diagnostics);
        Error::from_reason(format!("{reason} ({compact})"))
    }

    unsafe fn resize_window_for_client_size(
        hwnd: HWND,
        x: i32,
        y: i32,
        client_width: i32,
        client_height: i32,
        desired_logical_client: Option<(i32, i32)>,
        minimum_physical_client: Option<(i32, i32)>,
        dpi_override: Option<u32>,
        operation: &'static str,
        draw_menu_bar_result: Option<bool>,
    ) -> Result<(), Error> {
        let _dpi_awareness = ThreadDpiAwarenessGuard::per_monitor_v2();
        let pre_outer = read_window_rect(hwnd).ok_or_else(|| {
            Error::from_reason("Failed to inspect the native overlay host outer geometry")
        })?;
        let pre_client = read_client_rect(hwnd).ok_or_else(|| {
            Error::from_reason("Failed to inspect the native overlay host client geometry")
        })?;
        let dpi = dpi_override.unwrap_or_else(|| dpi_for_window(hwnd)).max(96);
        let requested_client = (client_width.max(1), client_height.max(1));
        let mut adjusted = RECT {
            left: 0,
            top: 0,
            right: requested_client.0,
            bottom: requested_client.1,
        };
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let has_menu = i32::from(!GetMenu(hwnd).is_null());
        if adjust_window_rect_ex_for_dpi(&mut adjusted, style, has_menu, ex_style, dpi) == 0 {
            return Err(Error::from_reason(
                "Failed to estimate the native overlay host outer geometry",
            ));
        }
        let adjust_estimate = adjusted;
        if has_menu != 0 {
            let mut nc_calc_probe = adjusted;
            nc_calc_probe.bottom = 0x7fff;
            SendMessageW(
                hwnd,
                WM_NCCALCSIZE,
                0,
                &mut nc_calc_probe as *mut RECT as LPARAM,
            );
            adjusted = apply_menu_wrap_estimate(adjusted, nc_calc_probe.top).ok_or_else(|| {
                Error::from_reason("Native overlay host menu geometry overflowed")
            })?;
        }
        let nc_calc_estimate = adjusted;
        let (estimated_width, estimated_height) =
            positive_rect_size(adjusted).ok_or_else(|| {
                Error::from_reason("Native overlay host outer geometry estimate was invalid")
            })?;
        let preferred_outer = rect_from_position_size(x, y, estimated_width, estimated_height)
            .ok_or_else(|| Error::from_reason("Native overlay host outer geometry overflowed"))?;
        let monitor = MonitorFromRect(&preferred_outer, MONITOR_DEFAULTTONEAREST);
        let mut monitor_info: MONITORINFO = mem::zeroed();
        monitor_info.cbSize = mem::size_of::<MONITORINFO>() as u32;
        if monitor.is_null() || GetMonitorInfoW(monitor, &mut monitor_info) == 0 {
            return Err(Error::from_reason(
                "Failed to inspect the native overlay host monitor work area",
            ));
        }
        let work_area = monitor_info.rcWork;
        let mut clamp_plan = clamp_outer_rect_to_work_area(preferred_outer, work_area)
            .ok_or_else(|| Error::from_reason("Native overlay host work area was invalid"))?;
        let mut diagnostics = WindowGeometryDiagnostics {
            operation,
            dpi,
            window_per_monitor_v2: window_is_per_monitor_v2(hwnd),
            style,
            ex_style,
            menu_attached: has_menu != 0,
            desired_logical_client: desired_logical_client
                .map(|(width, height)| GeometrySize { width, height }),
            requested_physical_client: GeometrySize {
                width: requested_client.0,
                height: requested_client.1,
            },
            minimum_physical_client: minimum_physical_client
                .map(|(width, height)| GeometrySize { width, height }),
            pre_outer: pre_outer.into(),
            pre_client: pre_client.into(),
            work_area: work_area.into(),
            adjust_window_rect_estimate: adjust_estimate.into(),
            nc_calc_size_estimate: nc_calc_estimate.into(),
            candidate_outer: clamp_plan.rect.into(),
            final_outer: None,
            final_client: None,
            clamp_reason: clamp_plan.reason(),
            correction_count: 0,
            final_residual: None,
            draw_menu_bar_result,
            success: false,
            error: None,
        };
        let apply = |rect: RECT| {
            let Some((width, height)) = positive_rect_size(rect) else {
                return false;
            };
            SetWindowPos(
                hwnd,
                ptr::null_mut(),
                rect.left,
                rect.top,
                width,
                height,
                SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED,
            ) != 0
        };
        if !apply(clamp_plan.rect) {
            return Err(geometry_failure(
                diagnostics,
                "Failed to apply the native overlay host geometry",
            ));
        }
        let mut actual_outer = read_window_rect(hwnd).ok_or_else(|| {
            geometry_failure(
                diagnostics.clone(),
                "Failed to verify the native overlay host outer geometry",
            )
        })?;
        let mut actual_client = read_client_rect(hwnd).ok_or_else(|| {
            geometry_failure(
                diagnostics.clone(),
                "Failed to verify the native overlay host client geometry",
            )
        })?;
        let actual_outer_size = positive_rect_size(actual_outer).ok_or_else(|| {
            geometry_failure(
                diagnostics.clone(),
                "Native overlay host outer geometry was invalid",
            )
        })?;
        let mut actual_client_size = positive_rect_size(actual_client).ok_or_else(|| {
            geometry_failure(
                diagnostics.clone(),
                "Native overlay host client geometry was invalid",
            )
        })?;
        let mut residual = geometry_residual(
            requested_client.0,
            requested_client.1,
            actual_client_size.0,
            actual_client_size.1,
        );

        if residual_requires_correction(clamp_plan, residual) {
            let corrected_size = corrected_outer_size(
                requested_client,
                actual_outer_size,
                actual_client_size,
                clamp_plan.width_clamped,
                clamp_plan.height_clamped,
            )
            .ok_or_else(|| {
                geometry_failure(
                    diagnostics.clone(),
                    "Native overlay host non-client geometry was invalid",
                )
            })?;
            let corrected = rect_from_position_size(
                actual_outer.left,
                actual_outer.top,
                corrected_size.0,
                corrected_size.1,
            )
            .and_then(|rect| clamp_outer_rect_to_work_area(rect, work_area))
            .ok_or_else(|| {
                geometry_failure(
                    diagnostics.clone(),
                    "Native overlay host correction geometry was invalid",
                )
            })?;
            clamp_plan = clamp_plan.followed_by(corrected);
            diagnostics.candidate_outer = clamp_plan.rect.into();
            diagnostics.clamp_reason = clamp_plan.reason();
            diagnostics.correction_count = 1;
            if !apply(clamp_plan.rect) {
                return Err(geometry_failure(
                    diagnostics,
                    "Failed to correct the native overlay host geometry",
                ));
            }
            actual_outer = read_window_rect(hwnd).ok_or_else(|| {
                geometry_failure(
                    diagnostics.clone(),
                    "Failed to verify the corrected native overlay host outer geometry",
                )
            })?;
            actual_client = read_client_rect(hwnd).ok_or_else(|| {
                geometry_failure(
                    diagnostics.clone(),
                    "Failed to verify the corrected native overlay host client geometry",
                )
            })?;
            positive_rect_size(actual_outer).ok_or_else(|| {
                geometry_failure(
                    diagnostics.clone(),
                    "Corrected native overlay host outer geometry was invalid",
                )
            })?;
            actual_client_size = positive_rect_size(actual_client).ok_or_else(|| {
                geometry_failure(
                    diagnostics.clone(),
                    "Corrected native overlay host client geometry was invalid",
                )
            })?;
            residual = geometry_residual(
                requested_client.0,
                requested_client.1,
                actual_client_size.0,
                actual_client_size.1,
            );
        }

        diagnostics.final_outer = Some(actual_outer.into());
        diagnostics.final_client = Some(actual_client.into());
        diagnostics.final_residual = Some(residual);
        if !geometry_satisfies_constraints(
            actual_client_size,
            minimum_physical_client,
            clamp_plan.width_clamped,
            clamp_plan.height_clamped,
            residual,
        ) {
            if minimum_physical_client.is_some_and(|(minimum_width, minimum_height)| {
                actual_client_size.0 < minimum_width || actual_client_size.1 < minimum_height
            }) {
                return Err(geometry_failure(
                    diagnostics,
                    "Native overlay host client geometry fell below its configured minimum",
                ));
            }
            return Err(geometry_failure(
                diagnostics,
                "Native overlay host client geometry retained an unexplained residual",
            ));
        }
        diagnostics.success = true;
        diagnostics.error = None;
        STANDALONE_DISPLAY_CLAMPED.store(clamp_plan.size_clamped(), Ordering::Relaxed);
        record_window_geometry_diagnostics(diagnostics);
        Ok(())
    }

    fn logical_pixels_to_physical(value: i32, dpi: u32) -> i32 {
        let scaled = (i64::from(value.max(1)) * i64::from(dpi.max(96)) + 48) / 96;
        scaled.clamp(1, i64::from(i32::MAX)) as i32
    }

    fn physical_pixels_to_logical(value: i32, dpi: u32) -> i32 {
        let dpi = dpi.max(96);
        let scaled = (i64::from(value.max(1)) * 96 + i64::from(dpi / 2)) / i64::from(dpi);
        scaled.clamp(1, i64::from(i32::MAX)) as i32
    }

    fn clamp_client_size_to_minimum(
        client_size: Option<(i32, i32)>,
        min_client_size: Option<(i32, i32)>,
    ) -> Option<(i32, i32)> {
        match (client_size, min_client_size) {
            (Some((width, height)), Some((min_width, min_height))) => {
                Some((width.max(min_width), height.max(min_height)))
            }
            (None, Some(minimum)) => Some(minimum),
            (client_size, _) => client_size,
        }
    }

    fn set_standalone_min_client_size(size: Option<(i32, i32)>) {
        let packed = size.map_or(0, |(width, height)| {
            ((width.max(1) as u64) << 32) | height.max(1) as u32 as u64
        });
        STANDALONE_MIN_CLIENT_SIZE.store(packed, Ordering::Relaxed);
    }

    fn standalone_min_client_size() -> Option<(i32, i32)> {
        let packed = STANDALONE_MIN_CLIENT_SIZE.load(Ordering::Relaxed);
        if packed == 0 {
            return None;
        }
        Some(((packed >> 32) as u32 as i32, packed as u32 as i32))
    }

    fn set_standalone_logical_client_size(size: Option<(i32, i32)>) {
        let packed = size.map_or(0, |(width, height)| {
            ((width.max(1) as u64) << 32) | height.max(1) as u32 as u64
        });
        STANDALONE_LOGICAL_CLIENT_SIZE.store(packed, Ordering::Relaxed);
    }

    fn standalone_logical_client_size() -> Option<(i32, i32)> {
        let packed = STANDALONE_LOGICAL_CLIENT_SIZE.load(Ordering::Relaxed);
        if packed == 0 {
            return None;
        }
        Some(((packed >> 32) as u32 as i32, packed as u32 as i32))
    }

    unsafe fn remember_standalone_logical_client_size(hwnd: HWND) {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        if style & WS_OVERLAPPEDWINDOW == 0 || IsIconic(hwnd) != 0 || IsZoomed(hwnd) != 0 {
            return;
        }
        let dpi = dpi_for_window(hwnd).max(96);
        if let Some(client) = read_client_rect(hwnd) {
            set_standalone_logical_client_size(Some((
                physical_pixels_to_logical((client.right - client.left).max(1), dpi),
                physical_pixels_to_logical((client.bottom - client.top).max(1), dpi),
            )));
        }
    }

    unsafe fn minimum_window_track_size(hwnd: HWND) -> Option<(i32, i32)> {
        let _dpi_awareness = ThreadDpiAwarenessGuard::per_monitor_v2();
        let (client_width, client_height) = standalone_min_client_size()?;
        let window_dpi = dpi_for_window(hwnd);
        let dpi = if window_dpi == 0 {
            dpi_for_system().max(96)
        } else {
            window_dpi.max(96)
        };
        let target_client_width = logical_pixels_to_physical(client_width, dpi);
        let target_client_height = logical_pixels_to_physical(client_height, dpi);
        let mut adjusted = RECT {
            left: 0,
            top: 0,
            right: target_client_width,
            bottom: target_client_height,
        };
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let has_menu = i32::from(!GetMenu(hwnd).is_null());
        if adjust_window_rect_ex_for_dpi(&mut adjusted, style, has_menu, ex_style, dpi) != 0 {
            let menu_client_top = if has_menu != 0 {
                let mut nc_calc_probe = adjusted;
                nc_calc_probe.bottom = 0x7fff;
                SendMessageW(
                    hwnd,
                    WM_NCCALCSIZE,
                    0,
                    &mut nc_calc_probe as *mut RECT as LPARAM,
                );
                Some(nc_calc_probe.top)
            } else {
                None
            };
            return minimum_track_outer_size(adjusted, menu_client_top);
        }

        let (window_width, window_height) = read_window_rect(hwnd).and_then(positive_rect_size)?;
        let (client_width, client_height) = read_client_rect(hwnd).and_then(positive_rect_size)?;
        let non_client_width = window_width.checked_sub(client_width)?;
        let non_client_height = window_height.checked_sub(client_height)?;
        Some((
            target_client_width.checked_add(non_client_width)?,
            target_client_height.checked_add(non_client_height)?,
        ))
    }

    unsafe fn reconcile_standalone_window_with_work_area(hwnd: HWND) {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        if style & WS_OVERLAPPEDWINDOW == 0 || IsIconic(hwnd) != 0 || IsZoomed(hwnd) != 0 {
            return;
        }
        let Some(current) = read_window_rect(hwnd) else {
            return;
        };
        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        let mut monitor_info: MONITORINFO = mem::zeroed();
        monitor_info.cbSize = mem::size_of::<MONITORINFO>() as u32;
        if monitor.is_null() || GetMonitorInfoW(monitor, &mut monitor_info) == 0 {
            return;
        }
        let work = monitor_info.rcWork;
        let current_outside = current.left < work.left
            || current.top < work.top
            || current.right > work.right
            || current.bottom > work.bottom;
        let was_clamped = STANDALONE_DISPLAY_CLAMPED.load(Ordering::Relaxed);
        if !current_outside && !was_clamped {
            return;
        }

        let dpi = dpi_for_window(hwnd).max(96);
        let (logical_width, logical_height) =
            standalone_logical_client_size().unwrap_or_else(|| {
                let client = read_client_rect(hwnd).unwrap_or(RECT {
                    left: 0,
                    top: 0,
                    right: rect_width(current),
                    bottom: rect_height(current),
                });
                (
                    physical_pixels_to_logical(rect_width(client), dpi),
                    physical_pixels_to_logical(rect_height(client), dpi),
                )
            });
        let minimum_physical_client =
            standalone_min_client_size().map(|(minimum_width, minimum_height)| {
                (
                    logical_pixels_to_physical(minimum_width, dpi),
                    logical_pixels_to_physical(minimum_height, dpi),
                )
            });
        if resize_window_for_client_size(
            hwnd,
            current.left,
            current.top,
            logical_pixels_to_physical(logical_width, dpi),
            logical_pixels_to_physical(logical_height, dpi),
            Some((logical_width, logical_height)),
            minimum_physical_client,
            Some(dpi),
            "work-area-reconcile",
            None,
        )
        .is_err()
        {
            SetWindowPos(
                hwnd,
                ptr::null_mut(),
                current.left,
                current.top,
                rect_width(current),
                rect_height(current),
                SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER | SWP_FRAMECHANGED,
            );
        }
    }

    unsafe fn primary_work_area() -> RECT {
        let mut work_area: RECT = mem::zeroed();
        if SystemParametersInfoW(
            SPI_GETWORKAREA,
            0,
            &mut work_area as *mut RECT as *mut std::ffi::c_void,
            0,
        ) != 0
            && work_area.right > work_area.left
            && work_area.bottom > work_area.top
        {
            return work_area;
        }
        RECT {
            left: 0,
            top: 0,
            right: GetSystemMetrics(SM_CXSCREEN).max(1),
            bottom: GetSystemMetrics(SM_CYSCREEN).max(1),
        }
    }

    fn centered_window_rect(width: i32, height: i32, work_area: &RECT) -> (i32, i32, i32, i32) {
        let work_width = (work_area.right - work_area.left).max(1);
        let work_height = (work_area.bottom - work_area.top).max(1);
        let width = width.max(1).min(work_width);
        let height = height.max(1).min(work_height);
        (
            work_area.left + (work_width - width) / 2,
            work_area.top + (work_height - height) / 2,
            width,
            height,
        )
    }

    #[cfg(test)]
    #[allow(clippy::items_after_test_module)]
    mod tests {
        use super::{
            apply_menu_wrap_estimate, centered_window_rect, clamp_client_size_to_minimum,
            clamp_outer_rect_to_work_area, corrected_outer_size, geometry_residual,
            geometry_satisfies_constraints, logical_pixels_to_physical,
            menu_text_without_mnemonics, minimum_menu_dpi, minimum_track_outer_size,
            normalize_windows_display_refresh_rate, physical_pixels_to_logical, positive_rect_size,
            rect_from_position_size, residual_requires_correction, residual_within_tolerance,
            set_standalone_logical_client_size, set_standalone_min_client_size,
            standalone_logical_client_size, standalone_min_client_size, OuterClampPlan, RECT,
        };

        #[test]
        fn windows_display_refresh_rejects_driver_default_sentinels() {
            assert_eq!(normalize_windows_display_refresh_rate(0), None);
            assert_eq!(normalize_windows_display_refresh_rate(1), None);
            assert_eq!(normalize_windows_display_refresh_rate(60), Some(60));
            assert_eq!(normalize_windows_display_refresh_rate(200), Some(200));
        }

        #[test]
        fn standalone_client_dimensions_scale_from_logical_pixels() {
            assert_eq!(logical_pixels_to_physical(1024, 96), 1024);
            assert_eq!(logical_pixels_to_physical(1024, 216), 2304);
            assert_eq!(logical_pixels_to_physical(768, 216), 1728);
            assert_eq!(logical_pixels_to_physical(1, 120), 1);
            assert_eq!(physical_pixels_to_logical(2304, 216), 1024);
            assert_eq!(physical_pixels_to_logical(1728, 216), 768);
            for dpi in [96, 120, 144, 168, 192, 216] {
                let physical = logical_pixels_to_physical(1280, dpi);
                assert_eq!(physical_pixels_to_logical(physical, dpi), 1280);
            }
        }

        #[test]
        fn standalone_minimum_client_dimensions_round_trip_atomically() {
            set_standalone_min_client_size(Some((640, 480)));
            assert_eq!(standalone_min_client_size(), Some((640, 480)));
            set_standalone_min_client_size(None);
            assert_eq!(standalone_min_client_size(), None);
        }

        #[test]
        fn standalone_logical_client_dimensions_round_trip_atomically() {
            set_standalone_logical_client_size(Some((1280, 720)));
            assert_eq!(standalone_logical_client_size(), Some((1280, 720)));
            set_standalone_logical_client_size(None);
            assert_eq!(standalone_logical_client_size(), None);
        }

        #[test]
        fn standalone_initial_client_size_respects_its_minimum() {
            assert_eq!(
                clamp_client_size_to_minimum(Some((320, 700)), Some((640, 480))),
                Some((640, 700))
            );
            assert_eq!(
                clamp_client_size_to_minimum(Some((1280, 720)), Some((640, 480))),
                Some((1280, 720))
            );
            assert_eq!(
                clamp_client_size_to_minimum(Some((320, 240)), None),
                Some((320, 240))
            );
            assert_eq!(
                clamp_client_size_to_minimum(None, Some((640, 480))),
                Some((640, 480))
            );
        }

        #[test]
        fn standalone_window_is_centered_and_clamped_to_the_work_area() {
            let work_area = RECT {
                left: 0,
                top: 0,
                right: 1920,
                bottom: 1040,
            };
            assert_eq!(
                centered_window_rect(1280, 760, &work_area),
                (320, 140, 1280, 760)
            );
            assert_eq!(
                centered_window_rect(2300, 1200, &work_area),
                (0, 0, 1920, 1040)
            );
        }

        #[test]
        fn standalone_outer_geometry_clamps_each_work_area_boundary() {
            let work = RECT {
                left: 0,
                top: 0,
                right: 2560,
                bottom: 1400,
            };
            let fit = clamp_outer_rect_to_work_area(
                rect_from_position_size(100, 100, 1200, 800).unwrap(),
                work,
            )
            .unwrap();
            assert_eq!(fit.reason(), "none");
            assert_eq!(positive_rect_size(fit.rect), Some((1200, 800)));

            let edge = clamp_outer_rect_to_work_area(
                rect_from_position_size(-50, 900, 1200, 800).unwrap(),
                work,
            )
            .unwrap();
            assert_eq!(edge.reason(), "position");
            assert_eq!((edge.rect.left, edge.rect.top), (0, 600));

            let width = clamp_outer_rect_to_work_area(
                rect_from_position_size(0, 100, 3000, 800).unwrap(),
                work,
            )
            .unwrap();
            assert_eq!(width.reason(), "width");
            assert_eq!(positive_rect_size(width.rect), Some((2560, 800)));

            let height = clamp_outer_rect_to_work_area(
                rect_from_position_size(100, 0, 1200, 1800).unwrap(),
                work,
            )
            .unwrap();
            assert_eq!(height.reason(), "height");
            assert_eq!(positive_rect_size(height.rect), Some((1200, 1400)));

            let both = clamp_outer_rect_to_work_area(
                rect_from_position_size(0, 0, 3000, 1800).unwrap(),
                work,
            )
            .unwrap();
            assert_eq!(both.reason(), "width-height");
            assert_eq!(positive_rect_size(both.rect), Some((2560, 1400)));
        }

        #[test]
        fn legion_go_200_percent_menu_geometry_is_a_valid_constraint() {
            let desired_client = (
                logical_pixels_to_physical(1280, 192),
                logical_pixels_to_physical(720, 192),
            );
            assert_eq!(desired_client, (2560, 1440));
            let work = RECT {
                left: 0,
                top: 0,
                right: 2560,
                bottom: 1400,
            };
            let outer = rect_from_position_size(0, 0, 2592, 1540).unwrap();
            let plan = clamp_outer_rect_to_work_area(outer, work).unwrap();
            assert!(plan.size_clamped());
            assert_eq!(positive_rect_size(plan.rect), Some((2560, 1400)));
            let residual = geometry_residual(2560, 1440, 2528, 1300);
            assert!(geometry_satisfies_constraints(
                (2528, 1300),
                Some((1280, 960)),
                true,
                true,
                residual,
            ));
        }

        #[test]
        fn menu_wrap_estimate_is_based_on_the_unmodified_preferred_rect() {
            let adjusted = RECT {
                left: -8,
                top: -31,
                right: 1288,
                bottom: 728,
            };
            let wrapped = apply_menu_wrap_estimate(adjusted, 26).unwrap();
            assert_eq!(wrapped.bottom, 754);
            assert_eq!(apply_menu_wrap_estimate(adjusted, 26).unwrap().bottom, 754);
            assert!(apply_menu_wrap_estimate(adjusted, i32::MAX).is_none());
        }

        #[test]
        fn minimum_track_size_includes_a_menu_row_added_at_the_target_width() {
            // AdjustWindowRectExForDpi estimated a single-row menu. The live
            // WM_NCCALCSIZE probe at the narrower configured minimum reports
            // another 23 physical pixels after localized labels wrap.
            let adjusted = RECT {
                left: -8,
                top: -31,
                right: 648,
                bottom: 488,
            };
            assert_eq!(minimum_track_outer_size(adjusted, None), Some((656, 519)));
            assert_eq!(
                minimum_track_outer_size(adjusted, Some(23)),
                Some((656, 542))
            );
        }

        #[test]
        fn standalone_geometry_allows_two_pixels_and_only_one_measured_correction() {
            assert!(residual_within_tolerance(geometry_residual(
                1280, 720, 1278, 722
            )));
            assert!(!residual_within_tolerance(geometry_residual(
                1280, 720, 1277, 720
            )));
            assert_eq!(
                corrected_outer_size((1280, 720), (1312, 800), (1277, 717), false, false),
                Some((1315, 803))
            );
            assert_eq!(
                corrected_outer_size((1280, 720), (1200, 700), (1280, 720), false, false),
                None
            );
        }

        #[test]
        fn standalone_geometry_corrects_only_unclamped_residual_axes() {
            let width_clamped = OuterClampPlan {
                rect: rect_from_position_size(0, 0, 1250, 760).unwrap(),
                width_clamped: true,
                height_clamped: false,
                position_clamped: false,
            };
            let wrapped_height_residual = geometry_residual(1280, 720, 1200, 700);
            assert!(residual_requires_correction(
                width_clamped,
                wrapped_height_residual
            ));
            assert!(!geometry_satisfies_constraints(
                (1200, 700),
                Some((640, 480)),
                true,
                false,
                wrapped_height_residual,
            ));
            // The measured 60px nonclient height includes the extra menu row.
            assert_eq!(
                corrected_outer_size((1280, 720), (1250, 760), (1200, 700), true, false),
                Some((1250, 780))
            );
            assert!(geometry_satisfies_constraints(
                (1200, 720),
                Some((640, 480)),
                true,
                false,
                geometry_residual(1280, 720, 1200, 720),
            ));

            let height_clamped = OuterClampPlan {
                rect: rect_from_position_size(0, 0, 1310, 700).unwrap(),
                width_clamped: false,
                height_clamped: true,
                position_clamped: false,
            };
            let width_residual = geometry_residual(1280, 720, 1270, 650);
            assert!(residual_requires_correction(height_clamped, width_residual));
            assert_eq!(
                corrected_outer_size((1280, 720), (1310, 700), (1270, 650), false, true),
                Some((1320, 700))
            );

            let both_clamped = OuterClampPlan {
                rect: rect_from_position_size(0, 0, 1200, 700).unwrap(),
                width_clamped: true,
                height_clamped: true,
                position_clamped: false,
            };
            assert!(!residual_requires_correction(
                both_clamped,
                geometry_residual(1280, 720, 1100, 620)
            ));
            assert!(geometry_satisfies_constraints(
                (1100, 620),
                Some((640, 480)),
                true,
                true,
                geometry_residual(1280, 720, 1100, 620),
            ));
        }

        #[test]
        fn standalone_geometry_rejects_below_minimum_and_unexplained_residuals() {
            assert!(geometry_satisfies_constraints(
                (1280, 720),
                Some((640, 480)),
                false,
                false,
                geometry_residual(1280, 720, 1280, 720),
            ));
            assert!(!geometry_satisfies_constraints(
                (1270, 720),
                Some((640, 480)),
                false,
                false,
                geometry_residual(1280, 720, 1270, 720),
            ));
            assert!(!geometry_satisfies_constraints(
                (1200, 700),
                Some((1280, 720)),
                true,
                true,
                geometry_residual(1280, 720, 1200, 700),
            ));
            assert!(rect_from_position_size(i32::MAX, 0, 2, 1).is_none());
            assert_eq!(
                positive_rect_size(RECT {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 1,
                }),
                None
            );
            assert_eq!(
                positive_rect_size(RECT {
                    left: 2,
                    top: 0,
                    right: 1,
                    bottom: 1,
                }),
                None
            );
            assert_eq!(
                positive_rect_size(RECT {
                    left: i32::MIN,
                    top: i32::MIN,
                    right: i32::MAX,
                    bottom: i32::MAX,
                }),
                None
            );
        }

        #[test]
        fn standalone_menu_scale_is_a_bounded_dpi_floor() {
            assert_eq!(minimum_menu_dpi(1.0).unwrap(), 96);
            assert_eq!(minimum_menu_dpi(1.25).unwrap(), 120);
            assert_eq!(minimum_menu_dpi(1.5).unwrap(), 144);
            assert!(minimum_menu_dpi(0.99).is_err());
            assert!(minimum_menu_dpi(4.01).is_err());
        }

        #[test]
        fn owner_drawn_menu_measurement_ignores_mnemonic_markers() {
            assert_eq!(
                String::from_utf16(&menu_text_without_mnemonics("&File")).unwrap(),
                "File"
            );
            assert_eq!(
                String::from_utf16(&menu_text_without_mnemonics("Save && E&xit\tAlt+F4")).unwrap(),
                "Save & Exit\tAlt+F4"
            );
        }
    }

    fn window_class_name() -> Vec<u16> {
        wide_string("SteamBridgeNativeOverlayWindow")
    }

    fn wide_string(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }
}

#[cfg(target_os = "windows")]
pub use windows::*;

