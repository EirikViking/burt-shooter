# Nova Swarm Localization

Nova Swarm uses English as the source interface language and keeps locale data under `src/i18n/`.

Supported in-game interface languages:

- English (`en`)
- German (`de`)

The Settings screen exposes `Language` with `System default`, `English`, and `Deutsch`. `System default` resolves the Steam current game language when the Electron Steam bridge can provide it, then falls back through the Electron/system locale, browser locale, and finally English. Manual English or German choices are saved locally under `novaSwarm.languagePreference.v1`; choosing `System default` clears that manual preference.

German support is interface text only. Voice audio remains English, and German subtitles should not be marked in Steamworks unless complete subtitle coverage is implemented for all voice lines. After German in-game QA passes, Steamworks may mark German as Interface supported only; do not mark German as Full Audio or Subtitles.

Store page localization and Steamworks language support settings are managed outside the game code and are not changed by this runtime localization layer.
