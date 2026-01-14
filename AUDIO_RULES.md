# Burt Shooter – Audio Rules

## General Rules
- All audio must be played via AudioManager
- Use string keys only
- All audio calls must be guarded
- Missing audio must never crash the game

## Rank Up Audio
- Rank-up audio must NOT reuse achievement audio
- Rank-up must always play at least one sound
- Prefer variation via pools of sounds
- If voice is rate-limited, SFX must still play

## Achievements
- Achievement audio is reserved
- Do not reuse achievement audio for rank-up, menu, or flavor events

## Stability
- Audio must never block gameplay
- Audio must never throw runtime errors
