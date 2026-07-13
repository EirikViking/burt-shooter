# ElevenLabs SFX Bake Report

Generated: 2026-07-13T10:02:55.071Z

This is a one-time local SFX asset bake. The shipped game plays local files only and does not call ElevenLabs at runtime.

## Summary

- Dry run: no
- Force/promote clean candidates: yes
- Model: eleven_text_to_sound_v2
- Output format request: mp3_44100_128
- Selected SFX files: 2
- Generated candidates: 4
- Technically clean candidates: 4
- Production replacements: 2
- Files with failures/warnings: 0

## Replacements

- public/audio/sfx/nova-swarm/nova_miracle_collect.mp3 from public/audio/sfx/nova-swarm-candidates/nova_miracle_collect.candidate-01.mp3
- public/audio/sfx/nova-swarm/nova_miracle_purge.mp3 from public/audio/sfx/nova-swarm-candidates/nova_miracle_purge.candidate-02.mp3

## Candidates

| SFX | Candidate | Duration | Size | Peak | Mean | Decision | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| nova_miracle_collect.mp3 | public/audio/sfx/nova-swarm-candidates/nova_miracle_collect.candidate-01.mp3 | 4 | 65245 | -3.2 dB | -17.0 dB | accepted |  |
| nova_miracle_collect.mp3 | public/audio/sfx/nova-swarm-candidates/nova_miracle_collect.candidate-02.mp3 | 4 | 65245 | 0.0 dB | -14.1 dB | clean_candidate | raw peak is very close to full scale (0.0 dB) |
| nova_miracle_purge.mp3 | public/audio/sfx/nova-swarm-candidates/nova_miracle_purge.candidate-01.mp3 | 3 | 48945 | 0.0 dB | -10.1 dB | clean_candidate | raw peak is very close to full scale (0.0 dB) |
| nova_miracle_purge.mp3 | public/audio/sfx/nova-swarm-candidates/nova_miracle_purge.candidate-02.mp3 | 3 | 48945 | -3.3 dB | -18.6 dB | accepted |  |

## Unchanged Production Files

- None.

## Rollback

```powershell
git checkout -- public/audio/sfx/nova-swarm
git checkout -- scripts/generate-nova-swarm-sfx.mjs docs/elevenlabs-sfx-bake.md docs/reviews/elevenlabs-sfx-bake-report.md
# or revert the final commit
```
