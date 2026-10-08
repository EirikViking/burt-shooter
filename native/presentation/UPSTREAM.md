# Native presentation provenance
Windows presentation code is adapted from MIT-licensed steam-bridge v0.4.6,
commit 9ca2aa1fe79320d8f6d544b8a77ea80d2c444e2e.
https://github.com/jstroh/steam-bridge/tree/v0.4.6

Only Windows surface, D3D11, DPI and bounded asynchronous texture-copy code is reused.
No upstream prebuilt addon or Steam wrapper is loaded. This module links no Steam API;
Nova Swarm retains its existing steamworks-ffi-node initialization/callback ownership.
Local changes: explicit bounds setter; host-only N-API exports; Windows-only surface.
Upstream CPU-frame functions are not exported to JavaScript or used in presentation.

N-API 3.9.4 (MIT) is pinned and vendored: build.rs skips libnode.dll linking
when dyn-symbols is selected, matching runtime symbol resolution from Electron.
