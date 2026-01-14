# Burt Shooter – Lore Overview

## What Lore Is
Lore defines the tone, personality, and humor of Burt Shooter.
It is grounded in:
- Eirik
- Kurt Edgar
- Stokmarknes and Melbu
- Harbor life, beer culture, rølp, late nights

Lore should feel local, chaotic, and playful, not generic arcade sci-fi.

## Canonical Lore Engine
All dynamic lore is generated from:

src/text/phrasePool.js

This file contains:
- Phrase pools
- Weighted fragments
- Deduplication logic
- Context-aware generators

## Supported Lore Types
phrasePool.js already supports:
- Rank-up flavor
- Enemy taunts
- Micro messages (pause, low health, boss intro)
- Loading screen text
- Highscore comments
- Level intro and game over flavor

## Rules for Adding or Using Lore
- Do NOT add new hardcoded text in scenes
- Use phrasePool.js generators instead
- Extend existing pools only when necessary
- Prefer reuse over expansion
