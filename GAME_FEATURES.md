# BURT SHOOTER - Game Features & Gameplay

## 🎮 Gameplay Overview

BURT SHOOTER er et klassisk vertikalt scrollende arkade shooter spill i stil med Galaga, men med moderne grafikkeffekter og masse humor fra Kurt Edgar og Eirik sitt univers.

---

## 🚀 Main Menu

Ved oppstart møter du:
```
╔════════════════════════════════════════╗
║                                        ║
║         BURT SHOOTER                   ║
║   Kurt Edgar & Eirik sitt Galaga      ║
║                                        ║
║   Stokmarknes er under angrep!        ║
║   Rølp, gris og mongo invaderer.      ║
║   Kun Eirik kan redde dagen.          ║
║                                        ║
║       [START SPILL]                    ║
║       [HIGHSCORES]                     ║
║                                        ║
║   Powered by Kjøttdeig Engine v1.0    ║
╚════════════════════════════════════════╝
```

---

## 🎯 Gameplay Flow

### Level System
- **Wave 1-4:** Standard fiender med økende vanskelighet
- **Wave 5:** BOSS FIGHT! (MEGA TUFS)
- **Wave 6-9:** Mer intense waves
- **Wave 10:** BOSS FIGHT! (ULTIMATE SVIN)
- Og så videre...

### Level Intro Messages
Hver level starter med en epic intro:
- "Wave 1: Grunnleggende gris"
- "Wave 2: Mongo intensifiserer"
- "Wave 3: Deili fetta kommer inn"
- "Wave 4: Rølp mode aktiverer"
- "BOSS: MEGA TUFS"

---

## 👾 Fiender

### 1. GRIS (Pink)
- **Helsepoeng:** 1
- **Score:** 10
- **Pattern:** Sine wave
- **Beskrivelse:** Basic grunt, enkel men farlig i grupper

### 2. MONGO (Brun)
- **Helsepoeng:** 2
- **Score:** 20
- **Pattern:** Sine wave (raskere)
- **Beskrivelse:** Tøffere variant, skyter oftere

### 3. TUFS (Oransje)
- **Helsepoeng:** 3
- **Score:** 30
- **Pattern:** Zigzag
- **Beskrivelse:** Uforutsigbar bevegelse, vanskelig å treffe

### 4. DEILI (Grønn)
- **Helsepoeng:** 4
- **Score:** 50
- **Pattern:** Circle
- **Beskrivelse:** Sirkel bevegelse, holder avstand

### 5. RØLP (Magenta)
- **Helsepoeng:** 5
- **Score:** 75
- **Pattern:** Drunk (kaotisk)
- **Beskrivelse:** Helt uforutsigbar, representerer kaos

### 6. SVIN (Rød)
- **Helsepoeng:** 8
- **Score:** 100
- **Pattern:** Aggressive chase
- **Beskrivelse:** Jager spilleren aktivt, farlig!

---

## 👹 Boss Fights

### Boss Characteristics
- **Massive størrelse** (3x større enn standard fiender)
- **Mange helsepoeng** (50+ base, øker med level)
- **3 Progressive faser:**
  - **Fase 1:** Horizontal sweep + single shots
  - **Fase 2:** Figure-8 pattern + triple shots (aktiveres ved 66% HP)
  - **Fase 3:** Aggressive chase + spiral bullets (aktiveres ved 33% HP)

### Boss Names (roterer):
- MEGA TUFS
- ULTIMATE SVIN
- SUPER MONGO
- HYPER RØLP
- DEILI FETTA PRIME
- GIGA GRIS

---

## 💪 Powerups

### ISBJØRN CAN (Oransje)
```
Effekt: Triple Shot
Varighet: 5 sekunder
Beskrivelse: "ISBJØRN CAN! Triple Shot!"
Tre bullets samtidig i spread pattern
```

### KJØTTDEIG BOOST (Rød)
```
Effekt: Speed Boost
Varighet: 5 sekunder
Beskrivelse: "KJØTTDEIG BOOST! Speed Up!"
1.5x movement speed
```

### RØLP MODE (Magenta)
```
Effekt: Rapid Fire + Damage
Varighet: 3 sekunder
Beskrivelse: "RØLP MODE! Rapid Fire!"
3x damage, 2x fire rate
```

### DEILI FETTA (Grønn)
```
Effekt: Ultimate Power
Varighet: 10 sekunder
Beskrivelse: "DEILI FETTA! Ultimate Power!"
5-way shot + 2x damage
```

**Drop chance:** 15% fra destroyed enemies

---

## 🎮 Controls

### Desktop
```
Movement:
  W / ↑    - Opp
  A / ←    - Venstre
  S / ↓    - Ned
  D / →    - Høyre

Actions:
  SPACE    - Skyt
  SHIFT    - Dodge (invulnerability)
  ESC      - Pause / Back to menu
```

### Mobile
```
Left side: Virtual joystick (drag for movement)
Right side: Tap to shoot
Dodge: Two-finger tap
```

---

## 💥 Visual Effects

### Particles
- **Eksplosjon:** 20 partikler i alle retninger når fiende dør
- **Hit Spark:** 5 gule partikler ved hit (ikke kill)
- **Pickup Effect:** 15 partikler oppover når powerup plukkes opp
- **Trail:** Subtile trails på bullets

### Screen Shake
- **Small hit:** 3 pixels shake
- **Player hit:** 8 pixels shake
- **Boss death:** 15 pixels shake
- Exponential decay for smooth feel

### Glow Effects
- Bullets har outer glow
- Powerups pulser (sin wave)
- Player har engine glow
- Boss har pulsing effect

### Animations
- Fiender roterer smooth
- Powerups roterer og pulser
- Player invulnerability blink
- Dodge transparency effect

---

## 🔊 Audio System

### Sound Effects
```
shoot      - 800Hz square wave (0.05s)
explosion  - White noise burst (0.2s)
hit        - 400Hz sawtooth (0.05s)
playerHit  - White noise burst (0.3s)
powerup    - Chord (440, 554, 659 Hz)
menuSelect - 600Hz sine (0.1s)
gameOver   - Descending tone (400-200Hz, 0.5s)
```

### Background Music
Simple melody loop (440, 494, 523, 587, 523, 494 Hz)

---

## 📊 HUD (Heads-Up Display)

### Top Left
```
SCORE: 12500
LEVEL: 7
```

### Top Right
```
LIVES: 2
STOKMARKNES
```

Location text roterer random mellom:
- STOKMARKNES
- MELBU
- HADSEL
- SORTLAND
- LOFOTEN

---

## 💀 Game Over

Ved game over vises en av disse meldingene:
- "MONGO VANT!"
- "RØLP OVERLOAD!"
- "GRIS DOMINANS!"
- "DEILI FETTA..."
- "TILBAKE TIL MELBU!"

Deretter kan du:
1. Skrive inn navn (maks 10 tegn, automatisk uppercase)
2. Trykke ENTER for å lagre score
3. Se highscore liste
4. Trykke ESC for å gå tilbake til meny

---

## 🏆 Highscore System

### Leaderboard Display
```
╔════════════════════════════════════════╗
║           HIGHSCORES                   ║
║      Stokmarknes sine beste           ║
║                                        ║
║ RANK  NAVN         SCORE      LEVEL   ║
║ ──────────────────────────────────────║
║  1    EIRIK        15000         8    ║ (Gull)
║  2    KURT         12000         7    ║ (Sølv)
║  3    MELBU         9500         6    ║ (Bronse)
║  4    STOKMARK      7500         5    ║
║  5    GRIS          5000         4    ║
║                                        ║
║          [TILBAKE]                     ║
╚════════════════════════════════════════╝
```

- **Topp 10** vises
- **Top 3** har spesielle farger (gull, sølv, bronse)
- Sortert etter score (høyest først)
- Viser navn, score og level nådd

---

## 🎯 Scoring System

### Base Points
- Gris: 10 pts
- Mongo: 20 pts
- Tufs: 30 pts
- Deili: 50 pts
- Rølp: 75 pts
- Svin: 100 pts
- Boss: 1000 pts

### Multipliers
- Ingen combo system (ennå)
- Poengsummen øker naturlig med level progression

---

## 🎨 Visual Style

### Color Palette
```
Player:     Cyan (#00ffff) - Tech/precision
Gris:       Pink (#ff69b4) - Basic
Mongo:      Brown (#8b4513) - Earthy
Tufs:       Orange (#ffaa00) - Warning
Deili:      Green (#00ff00) - Nature
Rølp:       Magenta (#ff00ff) - Chaos
Svin:       Red (#ff0000) - Danger
Boss:       Magenta → Orange → Red (phase dependent)
```

### Art Style
- **Geometric shapes** (hexagons for enemies, triangle for player)
- **Glowing neon aesthetic**
- **Smooth animations**
- **Particle-heavy** (juice!)
- **Retro-modern fusion**

---

## 🏃 Game Feel (Juice)

### What Makes It Feel Good
1. **Instant feedback** - Every action has immediate response
2. **Screen shake** - Impacts feel powerful
3. **Particles everywhere** - Visual satisfaction
4. **Sound on every action** - Audio feedback loop
5. **Smooth movement** - No stuttering
6. **Invulnerability frames** - Dodge feels tactical
7. **Powerup glow** - Clear visual upgrade
8. **Enemy variety** - Never boring
9. **Progressive difficulty** - Always challenging
10. **Boss spectacle** - Epic moments

---

## 🎭 Easter Eggs & Humor

### Hidden Text
- "Powered by Kjøttdeig Engine v1.0" (bottom of menu)
- Random location updates in HUD
- Humoristiske game over messages
- Level intro roasts

### Interne Referanser
Hele spillet er et love letter til Kurt Edgar og Eirik sitt univers:
- Powerup navn fra deres inside jokes
- Fiende typer representerer deres humor
- Location navn fra deres område
- Boss navn er overdrevne varianter

### Kameratslighet
Alt er ment som kameratlig humor, ikke som roast:
- "Mongo" er en venn, ikke en fiende
- "Rølp" er gøy, ikke negativt
- "Gris" og "Svin" er humoristisk, ikke grovt

---

## 🚀 Technical Highlights

### Performance
- **60 FPS locked** - Smooth gameplay
- **Efficient collision detection** - Circle-based
- **Particle pooling** - No garbage collection spikes
- **WebGL rendering** - Hardware accelerated

### Responsiveness
- **Input buffering** - No dropped inputs
- **Delta time** - Consistent on all devices
- **Touch optimization** - Mobile-friendly

### Polish
- **Fade in/out transitions**
- **Smooth camera effects**
- **Progressive loading**
- **Error handling**

---

## 📱 Platform Support

### Desktop
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Mobile
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Touch controls
- ⚠️ Performance may vary on older devices

### Requirements
- Modern browser with WebGL support
- JavaScript enabled
- ~500KB bandwidth for initial load

---

## 🎊 Konklusjon

BURT SHOOTER er et fullstendig, polert arkade shooter spill som kombinerer:
- Classic gameplay mechanics
- Moderne visual effects
- Humoristiske interne referanser
- Solid technical foundation
- Pure, ufiltrert gøy!

**SPILL DET NÅ:** https://e208f58c.burt-game.pages.dev

---

*"Når mongo kommer, må Eirik stå klar med Isbjørn can og kjøttdeig boost!"*
