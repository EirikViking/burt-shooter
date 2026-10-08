# Mystery combat revision

All 56 existing Mystery rigs now use mobile, aggressive combat profiles instead of the earlier stationary set pieces. Artwork is preserved. Each identity combines authored movement and weapons; selected designs lose working components and shed their actual atlas parts. Phase collapses, armor breakup, and staggered Choir deaths provide different endings. Short luminous lasers and compact detonations replace the old warning-lane artwork.

Mysteries still join ordinary waves, snakes and bosses through the existing seeded director. They never replace or clear the companion encounter. Mixed boss/snake attacks receive extra spacing. One Mystery is active at a time; its bullets, queued attacks, afterimages, atlas leases and sound sources are bounded and cleaned on defeat, retreat or scene change.

The existing female announcer has 56 new pre-arrival lines. Arrival waits for her line to finish and respects other dialogue. Mystery speech and SFX do not duck music or unrelated sounds. Each enemy has seven original ElevenLabs cues, with seven additional Choir motifs: 399 SFX and 56 spoken announcements. Audio remains English; no new visible English text or subtitles were introduced. Mysteries are omitted from the entire Threat Codex catalog, including old saved discoveries, without deleting save data.

## Editable sources and reproduction

- `src/config/MysteryCombatProfiles.js`: movement, weapons, component behavior, announcement scripts and individual sound direction.
- `src/entities/mysteries/*Mysteries.js`: existing editable atlas rigs. `MysteryCombat.js` drives combat and part animation; `MysteryActor.js` handles collision, outcomes and cleanup.
- `src/effects/MysteryEffects.js`: optical sprite materials, beams, charge effects, fragments and death choreography.
- `src/audio/MysteryAudio.js`, `MysteryAnnouncer.js`, cue and announcement manifests: lazy audio and voice sequencing. Narrow `AudioManager.js` changes allow explicit announcement assets, completion callbacks and optional music ducking.
- `public/audio/{sfx,voice}/mysteries-v2/`: 112 shipping MP3 banks/files.
- Original generated audio and detailed receipts: `E:/Codex/builds/nova-swarm/mystery-v2/audio/originals/` and `audio/generation.json`. These are unique production sources; retain them. The compact receipt is also kept with this document.

Use E: for temporary files, caches and build outputs. Set `TEMP` and `TMP` to `E:/Codex/tmp/mystery-v2`, and `npm_config_cache` to `E:/dev-cache/npm`.

1. `node scripts/generate-mystery-v2-audio.mjs` previews requests. `--generate` uses the authorized paid ElevenLabs account, resumes receipted originals and refuses uncertain requests/overage. It uses the existing female voice `SIbt9DJkaY96v2K2fQyQ`. No new clone or third-party audio was used.
2. `node scripts/master-mystery-v2-audio.mjs` reproduces shipping files from the preserved originals without new generation: trim, high-pass, loudness normalization, short fades and cue-bank assembly. No synthesized replacement audio.
3. Start the existing Vite source server on port 5217. Run `scripts/check-mystery-v2.mjs`, `check-mystery-v2-audio.mjs`, `check-mystery-mixed-contract.mjs`, `check-mystery-coexistence.mjs` and `check-mystery-policy.mjs`. Set `CHECK_URL` and an E: `CHECK_OUTPUT_DIR` for the shared checks. These supersede the historical stationary-encounter counterplay fixtures.
4. Run the release-line, i18n and Electron bridge checks. After committing the runtime, run `node scripts/update-build.cjs`, then `npm run build:current -- --config scripts/vite-mystery-v2.config.mjs`.
5. `node scripts/package-mystery-v2.mjs` overlays the compiled files and new audio onto the verified retained desktop baseline on E:. It checks every retained archive file and all changed files by hash. Its destination must be new; use `MYSTERY_PACKAGE_VERIFY_ONLY=1` to recheck an existing package. `docs/mysteries/delivery.json` identifies the baseline at production time; the package receipt records the resolved path.
6. Use `scripts/check-mystery-tour.mjs` with `NOVA_SWARM_PACKAGED_EXE` and an E: `CHECK_OUTPUT_DIR` for normal-keyboard packaged validation. Steam launch option: `--nova-mystery-test=all`; individual selectors remain available.

## Validation and limits

The 56-enemy runtime fixture checks movement, repeated attacks, component damage without farmable kills/score, exposed-core behavior, honest hidden hitboxes, kill-once rewards, retreats, queued attacks, bounded sprites/projectiles and released artwork. It deliberately uses stepped simulation and QA invulnerability; it is not human balance evidence. Separate normal-keyboard source/desktop tests use normal damage and lives. Coexistence fixtures cover ordinary, snake and boss companions; the tour queue covers all 56 transitions. Audio checks cover decoding, cue bounds, voice ordering, mute/cancel and absence of Mystery ducking.

Eight-language UI checks passed with no page errors, missing-text markers or detected English leaks. New spoken performances are intentionally English, consistent with the existing game's audio policy. Native-speaker translation review and a full 56-fight human playthrough are not claimed. This tool session cannot listen to audio; file validation and mix/queue checks are not a claim of an auditory quality review. Final performance and delivery measurements are recorded separately after the packaged run.

Source branch: `codex/mystery-combat-v2-20260912`. Baseline: `3ab0b19`. Inherited untracked work is preserved. No player ship/combat sprites, stats, weapons, progression, save format, leaderboard policy or achievements were changed. No public/store settings changes are part of this revision. Rollback should revert the runtime commit listed in the final delivery receipt; do not reset or discard inherited work.

Provider API references used for reproduction: [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) and [sound generation](https://elevenlabs.io/docs/api-reference/text-to-sound/convert).
