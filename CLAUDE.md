# Burt Shooter – Agent Contract

## Canonical Identity
Burt Shooter is a lore-driven arcade game.
Eirik, Kurt Edgar, Stokmarknes, Melbu, harbor life, beer culture,
late nights, and small-town chaos are canonical themes.

Lore is core identity, not decoration.

## Lore Rules
- Canonical lore source: src/text/phrasePool.js
- Reuse existing lore wherever text or flavor is needed
- Do NOT introduce new hardcoded lore arrays in scene files
- Prefer remixing existing lore over inventing new text

## Assets
- Asset rules are defined in ASSETS.md
- Asset locations and mappings are defined in src/assets/assetManifest.js
- Do NOT introduce new asset IDs, filenames, or loading paths
- Scene files must not hardcode asset filenames

## Audio
- All audio must be triggered via AudioManager using string keys
- All audio calls must be guarded (missing audio must never crash)
- Rank-up audio must NOT reuse achievement audio
- Prefer pools and variation

## Rank & Score Architecture
- Game.addScore is the single source of truth
- Only Game.addScore may trigger onRankUp
- No scene or update loop may recalculate rank
- PlayScene.onRankUp is idempotent safety only

### Rank System Rules (Non-Negotiable)
- **Total ranks:** 20
- **Valid rank indices:** 0 to 19
- **Source of truth:** BalanceConfig.ranks.NUM_RANKS and MAX_RANK_INDEX
- **Any code or manifest that assumes 78 ranks is invalid for this project**
- **Rank assets must exist only for indices 0 to 19**
- **RankAssets must clamp to 19**
- **RankManager must generate 20 thresholds only**
- **Do NOT change rank count without explicit approval**

#### Rank sprite loading rule
- HighscoreScene must never use Assets.get for rank textures unless Assets.load ran first
- RankAssets.loadRankTexture is the only approved way to load rank textures in scenes
- Rank sprite URLs must be built with encodeURI over the full path to handle spaces safely on Pages

## Safety
- Production behavior is the source of truth
- npm run build must always pass
