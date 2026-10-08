fn main() {
  println!("cargo::rustc-check-cfg=cfg(tokio_unstable)");
  let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap();
  let target_env = std::env::var("CARGO_CFG_TARGET_ENV").unwrap();
  // Dynamic N-API symbols come from the Electron executable; no libnode.dll.
  if target_os == "windows" && target_env == "gnu" && std::env::var_os("CARGO_FEATURE_DYN_SYMBOLS").is_none() {
    napi_build::setup();
  }
}
