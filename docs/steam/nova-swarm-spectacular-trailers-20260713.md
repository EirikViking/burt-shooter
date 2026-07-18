# Nova Swarm spectacular trailer set — 2026-07-13

## Outcome

Five new gameplay-first Steam masters were cut from the July 13 captures. They use the small corner toast language from the live trailers, rebuilt as faster neon Cabinet broadcasts rather than the rejected full-width black bars.

Recommended Steam order:

1. `01-nova-swarm-flagship.mp4` — first visible trailer and Steam microtrailer source.
2. `02-nova-swarm-tactical-draft.mp4` — explains the boss / draft / build loop.
3. `03-nova-swarm-boss-gauntlet.mp4` — uninterrupted boss pressure.
4. `04-nova-swarm-overrun.mp4` — route completion into Overrun escalation.
5. `05-nova-swarm-weird-shift.mp4` — short-form variety, formations, lasers, and Cabinet humor.

The approved files are under `release/steam-trailer/spectacular-20260713/final-masters/`. Earlier render versions remain available beside their reports for comparison and were not deleted.

## Research applied

- Steamworks says a potential customer may give a trailer less than ten seconds and may watch muted. The first trailer should therefore lead with representative gameplay, and Steam derives the microtrailer from the first visible trailer. All five new cuts show gameplay on frame one and carry the premise with readable corner broadcasts.
- Steam recommends 16:9 H.264/AAC at up to 1080p and 30 or 60 fps with at least 5 Mbps. Every approved master is 1920x1080, 60 fps, H.264 High, stereo AAC 48 kHz, and 12.95–21.45 Mbps.
- Trailer editor Derek Lieu's first-shot and editing-workflow guidance was applied by putting the most distinctive action first, structuring each cut around one promise, and escalating shot density instead of presenting a feature checklist.

Sources:

- https://partner.steamgames.com/doc/store/trailer
- https://www.derek-lieu.com/blog/2022/8/1/the-first-shot-of-the-game-trailer
- https://www.derek-lieu.com/blog/2022/10/24/basic-game-trailer-editing-workflow

## Audit of the current material

The two live Steam trailers were reviewed from their current public movie sources. Both are about 69.5 seconds. The gameplay trailer is colorful and representative, but repeats similar firing lanes for too long and has a weak escalation story. The Features trailer explains breadth but loses momentum in static menus and informational screens.

The rejected July 11 local candidates were also reviewed. Their main weaknesses were darker and sparser footage, mechanically repeated three-second shots, full-width black copy bars that covered action, too many similar firing poses, and little audio or pacing contrast.

The replacement set deliberately uses:

- 27–30 second runtimes;
- 1.35–2.90 second shots with concept-specific cadence;
- current July 13 gameplay only;
- a brighter but restrained gameplay grade and selected 1.025–1.05 punch-ins;
- animated 780x136 lower-left toast cards that clear the player ship;
- shipped Nova Swarm music, gameplay audio, impact accents, and toast whooshes;
- music ducking beneath combat and a continuous scored end-card tail;
- a 3.2-second branded end card after the gameplay promise has been shown.

## Final QC

All five masters passed the renderer's technical gate and were visually reviewed through twelve evenly sampled frames plus targeted half-second source maps. The boss and Overrun cuts were rejected and recut until their weak frames were removed. The final boss cut opens on a live vertical laser and ends in combat; the final Overrun cut replaces its wave-clear pause with active boss pressure.

| Master | Duration | Integrated loudness | Average bitrate | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| 01 flagship | 27.26 s | -14.2 LUFS | 19.74 Mbps | `5198D17405F4A882ADD536BE70B4A094C1526284DCB3E957BF40A3144BE9D076` |
| 02 tactical draft | 29.53 s | -14.6 LUFS | 12.95 Mbps | `0B0218757B65273D074F8EE90A3A6F744C7DFAA2C24896DD3FEA6AC7BA6E08DD` |
| 03 boss gauntlet | 27.05 s | -14.5 LUFS | 21.45 Mbps | `3B76A96DBC738BED9A8B586B097758ED00A9C215A01256F038221F91AEE0F8C9` |
| 04 Overrun | 28.02 s | -15.1 LUFS | 21.11 Mbps | `BD2A09B5166304BDAA4827179C82BA758C6C90A18E38C72ED47EF9B9F2A8CD53` |
| 05 weird shift | 27.96 s | -14.3 LUFS | 18.14 Mbps | `7D0D1B7000F85FC836372F77534E730026AF977530133DC1FF56AC4CF0C49FA4` |

The QC reports also check codec, resolution, frame rate, stereo format, black intervals, freezes, and long silence events. Final human by-ear approval is still prudent before a public Steam replacement because the automated pass measures the mix but cannot make a human taste judgment.

## Publication state

This task produced local masters only. Steamworks, the live Steam trailer order, and the store page were not changed. No upload or deploy was performed.
