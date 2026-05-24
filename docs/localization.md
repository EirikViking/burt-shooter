# Nova Swarm Localization

Nova Swarm uses English as the source interface language and keeps locale data under `src/i18n/`.

Supported in-game interface languages:

- English (`en`)
- German (`de`)
- Spanish Spain (`es`)
- Russian (`ru`)
- Simplified Chinese (`zh-CN`)
- Portuguese Brazil (`pt-BR`)
- Korean (`ko`)
- Japanese (`ja`)

The Settings screen exposes `Language` with `System default`, `English`, `Deutsch`, `Español`, `Русский`, `简体中文`, `Português do Brasil`, `한국어`, and `日本語`. `System default` resolves the Steam current game language when the Electron Steam bridge can provide it, then falls back through the Electron/system locale, browser locale, and finally English. Manual choices are saved locally under `novaSwarm.languagePreference.v1`; choosing `System default` clears that manual preference.

Steam language mappings currently supported by the runtime:

- `english` -> `en`
- `german` -> `de`
- `spanish` -> `es`
- `latam` -> `es` fallback only; Spanish Latin America is not separately reviewed
- `russian` -> `ru`
- `schinese` -> `zh-CN`
- `brazilian` -> `pt-BR`
- `koreana` -> `ko`
- `japanese` -> `ja`

German, Spanish Spain, Russian, Simplified Chinese, Portuguese Brazil, Korean, and Japanese support is interface text only. Voice audio remains English, and subtitles should not be marked in Steamworks unless complete subtitle coverage is implemented for all voice lines. After human QA passes for a language, Steamworks may mark that language as Interface supported only; do not mark Full Audio or Subtitles.

Future localization or deploy work must start from a clean baseline that includes the German in-game localization line, the top3 localization polish, the i18n UI baseline reliability fix, and the temporary marketing hotkeys. Do not build or deploy from stale branches that omit these paths.

Store page localization and Steamworks language support settings are managed outside the game code and are not changed by this runtime localization layer.

## Adding or Changing Text

English source text lives in the i18n source locale/pattern system. New player-facing text must be added through i18n keys, source text, or dynamic patterns/helpers, not as unmanaged hardcoded scene/UI copy.

When a change adds or edits visible text, update every supported locale in the same commit. If a translation cannot be completed immediately, add an explicit localization TODO that is detected by `npm run check:i18n` and report it; do not silently leave English fallback in non-English locales.

Dynamic/interpolated strings should use locale patterns/helpers so numbers, ranks, ship names, player names, and score values keep their formatting. `phrasePool` combat/story flavor text is player-facing too and must be localized with the rest of the interface.

After any player-facing text change, run `npm run check:i18n`. When layout or visible text changes, also run `npm run check:i18n-ui`. Visual QA is mandatory for CJK, Korean, Japanese, Russian, and other scripts where font/glyph/layout issues are likely.

Steamworks support remains Interface only unless localized audio or complete subtitles are actually implemented. Future deploys must not happen from stale branches and must verify the temporary marketing hotkeys are still present.

## 2026-05-24 Top 3 Polish Pass

The top 3 polish branch fixes Spanish punctuation/naturalness, shortens cramped Russian Settings labels, lightly polishes Simplified Chinese HUD wording, and fixes empty leaderboard overlap across English, German, Spanish Spain, Russian, and Simplified Chinese. Evidence is stored locally under `test-results/i18n-top3-polish-report/`.

## 2026-05-24 Next 3 Interface Batch

Portuguese Brazil, Korean, and Japanese were added as in-game interface locales on the next3 localization branch. Audio remains English, subtitles were not added, Steamworks settings were not changed, and these languages should only be marked Interface after human QA.
