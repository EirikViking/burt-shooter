# Arcade First Light

User authorized autonomous artistic choices, implementation and Steam upload. This explicit request supersedes intermediate skill approval gates. Two playable early Arcade set pieces, not a new progression system.

## Intent

Make the opening memorable through agency: rescue someone, then visibly dismantle an opponent. Normal move/fire controls suffice. Success means both moments actually work and read well in the running game, not a claim of measured retention.

## Convoy Breakout

Sector 1, after five seconds of ordinary active combat, a detailed prison transport sweeps into the upper battlefield. Two distinct targetable clamps hold allied fighters. Shooting a clamp releases its fighter into a curved escape path and then a support formation lasting up to ten seconds. Support fires compact ordinary friendly projectiles only while the player fires. The transport leaves after twelve seconds; missed rescues never block waves or remove existing rewards. No collision damage from the transport. Maximum two rescues per eligible sector.

## Dismantle the Rival

Sector 2, after four seconds of ordinary combat, a crimson raider arrives with visibly separate left and right weapon modules. Each module has independent health and a clear charging cue. Destroying a module permanently stops its specific attack, throws physical armor debris and exposes the central core after both are gone. Destroying the core creates a short cascading wreck breakup and releases one existing shield pickup. It expires after eighteen seconds and never delays the main boss or wave. No new leaderboard bonus, permanent currency, achievement or save key.

## Boundaries

Introduced in Arcade sectors 1 and 2, recurring in sectors ending in 1 and 2 respectively. Also available in Onslaught, Scout and Sector Start where ordinary waves permit; Daily and experiments excluded. Encounters yield to major events and allies leave at sector changes. Seeded route variation uses an independent hash, never global gameplay random draws. Existing score rules, enemy roster and save formats remain. Support uses the ordinary projectile collision/score path. Rivals use a capped small bullet count with a telegraph before each shot. Its owned projectiles are disposed at cancellation, death, transition and scene teardown. Pause freezes event simulation; resize uses the same gameplay viewport as physics. Text localized in all eight locales, low flash/reduced motion supported. Assets live in D source, builds/tests/temp on E.

## Art and sound

Two generated transparent overhead craft sprites, existing detailed allied craft and projectile textures. Articulated weapon modules, engine wakes, scorch marks and finite textured debris. No growing rings, screen-wide white flash or expanded player bullet glow. Existing quiet combat sounds; no additional overlapping voice channel.

## Verification

Pure policy/model regressions for mode scope, one-time scheduling, module destruction order, stale/piercing projectile hits, expiration, death, pause and restart. Real input browser runs for hit detection, rescue support, changed rival attacks, shield reward and both normal/low-flash/reduced-motion layouts. Actual screenshots inspected. Required build/i18n/UI/bridge/smoke/controller checks; fresh-profile packaged launch, control/display/performance. Upload only sector-continue-test and read back public unchanged.

## Inspiration

Galaga's rescue-based change in capability (https://galaga.com/en/special/int_vol1.php), Gunvein's action/reward rhythm (https://store.steampowered.com/app/2025840/Gunvein/), and Crimzon Clover's contrast between normal combat and powerful bursts (https://store.steampowered.com/app/1718160/Crimzon_Clover_World_EXplosion/). Original art/implementation, no copied assets.
