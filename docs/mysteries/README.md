# Mystery encounters

56 individually animated encounters, introduced from sector 11 through 60. These are combat sprites assembled from original transparent part atlases, with individually authored controllers; they do not replace player showroom models or combat sprites.

The level director makes one seeded appearance roll: 12% in sectors 11–20, 16% in 21–40 and 18% thereafter. A successful roll adds one Mystery to an eligible ordinary wave or the boss fight. The ordinary wave keeps its normal snake roll, so snake/Mystery combinations are possible. Existing enemies and projectiles remain. Challenges, additional reinforcement slots, Daily Signal and authored experimental waves are excluded from the lottery. Only one Mystery is active at once. Available identities expand to 7/14/24/36/46/56 by sectors 15/20/30/40/50/60; unseen identities are preferred.

Confirmed defeats award 2,500 points plus 100 per sector beyond 11, capped at 10,000 base points. Optional Temptation objectives can add up to 2,500. Components and escapes award no defeat bonus. Existing combo rules still apply to a confirmed encounter kill. The Codex hides unknown names, art and descriptions; sighting reveals the description, defeat reveals counterplay. Text is provided in all eight supported languages; names remain intentional proper names.

## Practice

Use `--nova-mystery-test=glass_widow` in Steam Launch Options, replacing the ID with any entry in [the roster](production-roster.json). These launches use an isolated temporary profile, five fixed augments, ordinary damage and lives, and no ranked rewards or account writes. The test opens the hangar first: choose any of the 30 ships and press START (or ENTER/controller confirm). All hulls are loaned only inside this isolated session; career unlocks are not changed. Individual and full-tour tests, plus the two combined-boss options, all use sector 30 difficulty. Restart to repeat; remove the option to play normally. The existing female announcement plays before each Mystery arrives and waits for other dialogue. Keep Voice enabled in Settings.

Use `--nova-mystery-test=all` to test all 56 in roster order at sector 30 difficulty, with all 56 identities available regardless of their campaign unlock sector. A normal lead-in wave precedes 56 authored combat waves, each joined by the next Mystery. Each wave and its Mystery must finish before the next wave begins. Defeat and the normal timed escape both advance the sequence. Controls, player vulnerability, lives, weapons, cooldowns and enemy controllers use the normal game rules; this is not an invulnerable gallery. Losing all lives ends the run normally. Remove the argument to leave the isolated test. Numeric selectors 1–56 also remain supported.

## Production and costs

- `public/art/mysteries/`: 56 original RGBA atlases, 80,319,244 bytes. `image-receipts.json` records original paths and hashes; production prompts and spacing revisions are retained here. No third-party asset packages or external project uploads were used.
- `src/entities/mysteries/`: eight authored controller families and shared collision, warning, lifecycle and atlas lease support. `src/config/Mysteries.js` owns identity and reveal timing.
- `public/audio/sfx/mysteries/`: 56 lazy banks, 22,919,562 bytes. Six original ElevenLabs cues per identity; Choir Unbound additionally has seven individual original singer motifs. Original MP3s, editable WAV masters, requests, hashes and provider receipts are retained in `audio/`.
- Included ElevenLabs balance moved from 191,592 to 181,141 during these requests: a 10,451-credit observed change. This is a balance difference, not an invented per-cue invoice. No purchase or overage was requested.
- Art leases release at encounter end and retain at most two idle atlases. Audio retains at most three decoded banks and four simultaneous voices. Warnings lower music and incidental speech; death audio receives an exclusive voice window. Controls for music, SFX, voice and pause remain effective.

## Reproducing and checking

1. Keep the original atlas exports, then admit an original with `node scripts/admit-mystery-art.mjs "id=absolute-path.png"` and run `python scripts/inspect-mystery-atlases.py`. The inspector checks alpha, isolated frame bounds and contamination; it does not edit pixels. Fine animation comes from the editable controllers, not prerecorded video.
2. `node scripts/generate-mystery-audio.mjs` previews an authored batch. Generating requires `--generate`, the included-credit budget and an ElevenLabs credential in the environment. `MYSTERY_AUDIO_BATCH` selects 1–8; batch 9 holds the choir motifs. Receipts prevent duplicate or uncertain retries.
3. Run `node scripts/master-mystery-audio.mjs` to reproduce WAV masters and runtime banks. `MYSTERY_AUDIO_ID` limits a revision to one identity. Processing uses the original samples at native pitch, with filtering, loudness control and bounded fades; no local synthesized sounds.
4. Run `node scripts/check-mystery-policy.mjs`. For runtime checks, start the normal development server and set `CHECK_URL`, then run `check-mystery-lifecycle.mjs`, `check-mystery-counterplay.mjs`, `check-mystery-integration.mjs` and the selected `check-mystery-runtime.mjs` IDs. All live under `scripts/`.
5. Run the repository release, i18n, build, bridge and UI checks. Package new art, audio and `electron/mysteryTestIds.json` together with the compiled runtime.

## Evidence and limits

Development captures are actual 1920×1080 runtime output. The inspection harness holds the player invulnerable and does not shoot while inspecting animation. Full-cycle checks exercise all 56 escapes and cleanup; component checks exercise all 56 defeat bonuses and linked-part removal. Seeded tests sample 20,000 seeds at each of eight depths. Separate real-time offense probes use real movement, projectiles and collision with incoming damage ignored, so they measure an offense baseline, not human survival rates.

The four offense probes took 27.33 seconds (Glass Widow), 25.83 (Siege Orchid), 39.58 (Choir Unbound), and 36.80 (Witness) with the fixed practice loadout at sectors 31/31/58/60. Mean frame intervals were 16.68 ms; p95 ranged 18.5–19.2 ms, with isolated maxima of 34.1–37.2 ms. No build or other capture ran concurrently. The machine has an RTX 2060 and integrated Radeon GPU; renderer identification is recorded separately with desktop validation.

These are not human win-rate measurements. Visual review covered representative runtime views and targeted corrections. Audio creation, decoding, mixing priorities and resource behavior are checked; human listening remains valuable for individual artistic preferences and speaker/headphone balance. Cross-language strings are implemented and checked automatically, with representative screenshots; native-speaker review is not claimed.

Source branch: `codex/mystery-encounters-20260910`. Mystery work starts at `b68ac5d` after the verified combined-boss delivery; original release baseline `b22ea81`. Inherited work was preserved. Rollback is a targeted revert of the Mystery implementation commit; do not reset or clean the worktree. Steam delivery status and exact build provenance belong in `delivery.json` once verified. Public Steam and store settings remain outside this change.
