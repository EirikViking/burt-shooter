# Nova Swarm Localization

Nova Swarm uses English as the source interface language and keeps locale data under `src/i18n/`.

Supported in-game interface languages:

- English (`en`)
- German (`de`)
- Spanish Spain (`es`)
- Russian (`ru`)
- Simplified Chinese (`zh-CN`)

The Settings screen exposes `Language` with `System default`, `English`, `Deutsch`, `Español`, `Русский`, and `简体中文`. `System default` resolves the Steam current game language when the Electron Steam bridge can provide it, then falls back through the Electron/system locale, browser locale, and finally English. Manual choices are saved locally under `novaSwarm.languagePreference.v1`; choosing `System default` clears that manual preference.

Steam language mappings currently supported by the runtime:

- `english` -> `en`
- `german` -> `de`
- `spanish` -> `es`
- `latam` -> `es` fallback only; Spanish Latin America is not separately reviewed
- `russian` -> `ru`
- `schinese` -> `zh-CN`

German, Spanish Spain, Russian, and Simplified Chinese support is interface text only. Voice audio remains English, and subtitles should not be marked in Steamworks unless complete subtitle coverage is implemented for all voice lines. After human QA passes for a language, Steamworks may mark that language as Interface supported only; do not mark Full Audio or Subtitles.

Future localization or deploy work must start from a clean baseline that includes both the German in-game localization line and the temporary marketing hotkeys. Do not build or deploy from stale branches that omit either path.

Store page localization and Steamworks language support settings are managed outside the game code and are not changed by this runtime localization layer.
