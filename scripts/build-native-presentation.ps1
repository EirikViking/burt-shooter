param(
  [Parameter(Mandatory=$true)][string]$StageRoot,
  [string]$OutputRoot='E:\Codex\builds\nova-swarm\native-overlay',
  [string]$TempRoot='E:\Codex\tmp\nova-native-overlay'
)
$ErrorActionPreference='Stop'
$stage=(Resolve-Path -LiteralPath $StageRoot).Path
foreach($target in @($stage,$OutputRoot,$TempRoot)) {
  if([IO.Path]::GetPathRoot([IO.Path]::GetFullPath($target)) -ne 'E:\') { throw "Native build path must be on E: $target" }
}
New-Item -ItemType Directory -Force $OutputRoot,$TempRoot | Out-Null
$env:TEMP=$TempRoot;$env:TMP=$TempRoot
$env:CARGO_HOME='E:\dev-cache\cargo'
$env:CARGO_TARGET_DIR=Join-Path $OutputRoot 'rust-target'
$rust='E:\dev-cache\rustup\toolchains\1.94.0-x86_64-pc-windows-gnu\bin'
$llvm='E:\dev-cache\llvm-mingw\llvm-mingw-20260908-ucrt-x86_64\bin'
$env:PATH="$rust;$llvm;$env:PATH"
$env:CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=Join-Path $llvm 'x86_64-w64-mingw32-gcc.exe'
$env:RUSTFLAGS='-C link-self-contained=yes'
Push-Location (Join-Path $stage 'native\presentation')
try {
  & "$rust\cargo.exe" build --release --locked
  if($LASTEXITCODE -ne 0){throw 'Native presentation build failed'}
  $out=Join-Path $stage 'electron\native'
  New-Item -ItemType Directory -Force $out | Out-Null
  Copy-Item -LiteralPath (Join-Path $env:CARGO_TARGET_DIR 'release\nova_presentation.dll') -Destination (Join-Path $out 'nova_presentation.node') -Force
  Copy-Item -LiteralPath 'LICENSE-steam-bridge' -Destination (Join-Path $out 'LICENSE-steam-bridge.txt') -Force
  Copy-Item -LiteralPath 'THIRD_PARTY_NOTICES.txt' -Destination (Join-Path $out 'THIRD_PARTY_NOTICES.txt') -Force
  Copy-Item -LiteralPath (Join-Path $rust '..\share\doc\rust\COPYRIGHT.html') -Destination (Join-Path $out 'RUST-COPYRIGHT.html') -Force
  Copy-Item -LiteralPath (Join-Path $rust '..\share\doc\rust\COPYRIGHT-library.html') -Destination (Join-Path $out 'RUST-LIBRARY-COPYRIGHT.html') -Force
  Get-FileHash (Join-Path $out 'nova_presentation.node')
} finally { Pop-Location }
