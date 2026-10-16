# CLAUDE.md — Hill Station Hideout

This file is the source of truth for the game design and code conventions. Every change must follow it. If a change needs to break a rule here, update this file in the same commit.

## Context

- Built for a **24-hour game jam**, theme **"Four Seasons"**.
- Judging rubric (100 pts):
  - Theme drives gameplay — 25
  - Gameplay & Fun — 30
  - Consistent Art & Audio — 20
  - Build runs start to finish with no help — 15
  - Originality — 10
- **Judges play Level 1 only.** Level 1 must be short (about 4–6 minutes), easy, and understandable within the first minute. Prioritise polish and reliability of Level 1 over later-level content.
- "Runs with no help" is worth 15 points: never ship a state where the game crashes, soft-locks, or needs console tricks. Every screen must show which key to press next.

## Tech rules

- Plain HTML + JavaScript (ES modules via `<script type="module">`). **No build step, no npm.**
- Phaser 3 from CDN, **pinned exactly**: `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`. Do not change the version without a reason.
- Must run via a simple static server (`python3 -m http.server 8000`) and on **GitHub Pages**. Therefore:
  - Use **relative paths only** (`./src/...`, `assets/...`), never absolute `/src/...` (breaks on a Pages sub-path).
  - File names are case-sensitive on Pages — match imports exactly.
- Phaser is a global (`Phaser`), loaded by a classic script tag before the module entry point.
- Arcade Physics only.

## Game design

### Premise
**"Hill Station Hideout"** — the player is a guest staying at a guest house in a hill station. Plain-clothes (civil-dressed) police are searching for them. The player must keep moving through the activities around the guest house while staying out of sight.

### Genre
Side-scrolling 2D platformer with stealth. Each **season** is one stage that scrolls left to right.

### Seasons and hurdles
Each season has **exactly 3 hurdles**, each based on that season's real activity. Crossing all 3 hurdles takes the player into the next season. Order: Spring → Summer → Fall → Winter.

| Season | Role | Hurdle 1 | Hurdle 2 | Hurdle 3 |
|---|---|---|---|---|
| **Spring** | Chill tutorial. Few police, slow patrols. | Calm meadow walk | Stepping stones over a stream | Flower garden with bushes to hide in |
| **Summer** | | Quarry: jump across rock gaps | Canoeing: steer a canoe, dodge rocks on the river | Swimming: cross a lake with a breath meter, dive under to avoid being seen |
| **Fall** | Vintage train around the facility showing fall colours | Jump onto and across moving train carriages | Cross the tracks between passing trains | Leaf-covered path: leaf piles hide both pitfalls and hiding spots |
| **Winter** | Ski run | Downhill slalom: speed builds, slippery controls | Ski-jump gap | Blizzard: visibility drops for both player and police |

### One shared engine (hard rule)
- There is **one engine**: `Player`, police, hiding, lives, hurdles, HUD, level building. It never special-cases a season.
- **A season = a config file (`src/seasons/<season>.js`) + a layout file (`src/seasons/layouts/<season>.js`).** Nothing else.
- **Every hurdle is a platformer section with one twist** (e.g. water fails you, low friction, moving carriages, low visibility). Never a separate mini-game with its own controls. Canoeing, swimming and skiing are still the same run/jump/hide controls, with the twist expressed through physics, hazards or hiding spots in config.
- If a twist needs new behaviour, add it to the shared engine as a generic, config-driven feature (e.g. "moving platforms", "visibility radius") that any season can use.

**Seasons must change the RULES, not just the visuals.** Movement, friction, visibility, hazards and hiding spots differ per season. Each season's config file in `src/seasons/` declares these differences.

### Police
- Walk patrol routes and show a **visible vision cone**.
- While the player is inside a cone, a **detection meter** fills. When it is full the player is caught. It drains when the player is out of sight.
- **Hiding:** pressing **Down** at a hiding spot (bush, train carriage, snow hut, under water, etc.) hides the player. Police cannot see a hidden player.

### Lives
- Start Level 1 with **3 lives**.
- Getting caught or failing a hurdle: **−1 life**, respawn at the start of that hurdle.
- Each hurdle crossed: **+0.5 life**.
- Lives **carry forward** from season to season.
- Lives reach 0 → **Game Over**.

### Levels and coins
- Completing all 4 seasons finishes one level.
- At level end, remaining lives are redeemed for coins: **100 coins per full life, 50 per half life**, plus a small **speed bonus**.

### Guest house hub
Between levels the player returns to their room at the guest house and spends coins on room upgrades, items, and unlocking extra hiding places in the levels.

### Difficulty
Each new level increases police count, patrol speed, vision cone length and detection speed, and tightens hurdle timing. **Level 1 is deliberately easy for the judges.**

### Controls (planned)
- Left / Right (or A / D): move
- Up / Space (or W): jump
- Down (or S): hide at a hiding spot / dive (swimming)

## Code structure

```
index.html              loads Phaser (CDN) then src/main.js as a module
src/main.js             Phaser game config + scene list
src/scenes/             BootScene, MenuScene, GameScene, SeasonTransitionScene,
                        HubScene, GameOverScene, LevelCompleteScene
src/seasons/            one config per season (spring.js, summer.js, fall.js, winter.js):
                        physics, palette, police, hurdle names/hints, ambient particles
                        + index.js exporting SEASON_ORDER
src/seasons/layouts/    one layout per season: ground, platforms, water, hiding spots,
                        decor, signs, hurdle start/end lines, goal (pixel coordinates)
src/entities/           Player, Police, HidingSpot
src/systems/            LevelBuilder (layout → terrain/hazards/triggers), HurdleSystem
                        (start/end trigger zones, checkpoints), LivesSystem, SaveSystem,
                        AudioSystem, DifficultySystem
src/art/                TextureFactory (all sprites drawn in code), Backdrop (parallax)
src/ui/                 Hud (hearts, hurdle progress, banners, panels)
src/config/game.js      global tunables (lives, coins, player feel, camera, respawn, UI, depths)
src/config/levels.js    difficulty numbers per level
assets/                 images, audio (add when needed)
```

### Conventions
- **No magic numbers in scenes.** All tunable numbers (speeds, lives, coin values, difficulty scaling, timings) live in `src/config/` or `src/seasons/`.
- Scene keys are the class names (e.g. `'GameScene'`).
- Run state (current level, season index, lives, coins, elapsed time) is passed between scenes via `scene.start(key, data)`; persistent state (coins, unlocks) goes through `SaveSystem` (localStorage, wrapped in try/catch).
- Season configs are data; `GameScene` reads the current season config and builds the stage from it, so adding/tuning a season never requires editing the scene.
- Keep modules small and focused; one class per file in `entities/` and `systems/`.
- Art is drawn in code from the season palette (no image files yet). Keep the look consistent: soft pastel shapes, dark-brown outlined text, the player in a navy coat, red scarf and brown hat.
- A season without a `layout` shows a placeholder screen (press N to finish), so the full flow always runs.
- `window.__game` exposes the Phaser game for debugging/automated playtests. Set `DEBUG.physics` in `src/config/game.js` to see bodies and trigger zones.

### Layout design rules
- Ground top is `layout.groundY`; the world is one screen tall and scrolls horizontally only.
- A full running jump covers ~185px horizontally and ~110px vertically with Spring physics. Space gaps so that jumping from anywhere on a platform while holding forward lands safely in Spring; tighten in later seasons/levels.
- Hurdle start/end lines must span the full path (the player cannot skip them). The respawn checkpoint is the active hurdle's start line.

## Scene flow

```
Boot → Menu → Game(spring) → SeasonTransition → Game(summer) → … → Game(winter)
     → LevelComplete → Hub → Menu (or next level)
Game → GameOver (lives = 0) → Menu
```
