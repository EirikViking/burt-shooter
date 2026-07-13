# Nova Miracle asset provenance

Generated: 2026-07-13

## Built-in Codex image generation

- Mode: built-in Codex image generation, new image.
- Disclosure: AI-generated production game icon.
- Saved source: `public/art/generated/nova-swarm/powerups/imagegen-source-20260713/nova_miracle.png`
- Runtime asset: `public/art/generated/nova-swarm/powerups/nova-powerup-nova_miracle-20260713.png`
- Runtime contract: transparent RGBA PNG, 192x192.

Final prompt:

> Use case: production game power-up icon for the neon arcade space shooter Nova Swarm. Create a single centered, isolated NOVA MIRACLE artifact: a radiant crystalline heart-shaped stellar core containing a tiny white supernova, encircled by three elegant concentric shockwave halos and eight crown-like solar rays. The silhouette must read instantly at 48-64 pixels. Premium jackpot feeling, euphoric and overwhelmingly gratifying, white-gold core with cyan and hot-magenta neon facets, a few orange highlights, razor-crisp sci-fi arcade rendering, luminous bloom contained close to the silhouette, strong contrast, symmetrical frontal icon, no characters. Match the visual density and angular crystalline energy of the provided reference game's existing super-life icon, while making this rarer reward feel more celestial and world-clearing. No text, no letters, no numerals, no UI frame, no border, no mockup, no shadow plane. IMPORTANT: background must be perfectly flat, uniform, fully opaque chroma green #00FF00 with no gradient, texture, glow, reflections, particles, or green spill; no green anywhere in the subject. Square 1024x1024 bitmap.

The generated source was copied without deleting the original Codex output. The flat green field was removed with the imagegen skill's `remove_chroma_key.py` using corner sampling, soft matte, one-pixel edge contraction, feathering, and despill. The resulting transparent icon was trimmed and resized with ImageMagick into the existing 192x192 powerup slot.

## ElevenLabs sound generation

- Model: `eleven_text_to_sound_v2`.
- Disclosure: both runtime SFX are AI-generated original sound effects.
- Runtime assets: `nova_miracle_collect.mp3` and `nova_miracle_purge.mp3`.
- Detailed prompts, candidate selection, hashes, duration, codec, bitrate, peak, and mean loudness: `docs/reviews/nova-miracle-elevenlabs-report.md`.
- Runtime behavior: the shipped game plays local files only and makes no ElevenLabs call.
