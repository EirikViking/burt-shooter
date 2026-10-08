# Space snake broods and session fixes

Source branch: `codex/space-snake-broods-20260912`. Baseline: `70d892e`.

Each eligible mother rolls once at 25%; a selected clutch hatches 5–20 independently damageable juveniles. Fourteen authored anatomies accompany fourteen weapon patterns. Only two juveniles wind up/strike at once; combined boss encounters share the existing warning admission. Grave, Sunforge and Lamprey can restore at most 8% of the mother's original health across the whole clutch. Killing the mother sends survivors fleeing for two seconds, then disposes them. No respawning or unlimited healing.

Art source: `juvenile-atlas-source.png`, generated through the OpenAI image tool using `art-prompt.txt`. No third-party stock assets or project uploads. The full alpha atlas is preserved. Runtime skins flex on 7 × 12 vertex meshes; no Blender render is presented as runtime evidence.

Run `node scripts/prepare-snake-brood-art.mjs` to derive the 16 runtime WebP textures. Source overrides use `BROOD_ART_SOURCE`.

Audio source: 70 ElevenLabs generated originals in `audio-originals/`, with prompts, exact request outcomes and commercial paid-plan provenance in `audio-provenance.json`. Actual credits consumed: 1,476 (173,766 → 172,290), within the 10,000 cap. Rejected overlength prompts are preserved as rejected requests. Five cues per family: hatch, communication, attack, support, death. Runtime contains 14 compressed cue banks, lazily decoded with a three-family cache and four concurrent voices. Audio respects SFX/master/pause controls and never ducks music.

The 56 mystery announcements retain their performances and timing, remastered against the immutable baseline to approximately -13.5 LUFS. Runtime uses the ordinary announcement gain; the existing exclusive speech queue remains active.

Steam readiness is published before the optional friends download, with bounded waiting and automatic recovery. A failed availability check no longer becomes a permanent session verdict. The score page restores Steam tabs while preserving an intentionally selected Local view. Native Steam validation is read-only; automated recovery tests use an isolated fake platform.

Startup prepares the selected real 3D model, compiles materials, warms the canvas transfer and GPU upload under the existing loading screen, then reveals the menu. It does not preload the fleet. The watchdog follows bounded boot steps, with an overall ceiling.

Validation: `node scripts/check-snake-broods.mjs`, `node scripts/check-snake-brood-flow.mjs`, `node scripts/check-steam-session-recovery.mjs`, plus existing release, leaderboard, encounter, score, voice, controller, build and locale checks. Test artifacts live under `E:/Codex/builds/nova-swarm/snake-broods/`. Combat fixtures use real actors with stepped time and a QA-invulnerable player; they are not human balance reviews.
