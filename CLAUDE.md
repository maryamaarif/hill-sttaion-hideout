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

## Judging and deployment
- **Live build**: GitHub Pages from `main` (root) at <https://maryamaarif.github.io/hill-sttaion-hideout/>. `.nojekyll` keeps Pages from processing files. Every path is relative and every import matches its file name's case exactly (Pages is case-sensitive, macOS is not).
- **`?demo=1`** (hidden): tops coins up to `DEMO.coins` at boot so judges can try the shop ("Your room" on the title screen).
- **Credits**: `CREDITS.md` and the in-game Credits screen (`src/config/credits.js`) list all third-party software (Phaser 3.80.1, MIT, via jsDelivr; system fonts; system emoji). Keep both in step when adding anything third-party. All art and audio are made in code by the team.
- Level 1 target: about 4–6 minutes for a first-time player, no dead ends: every failure respawns at the hurdle start, and moving platforms and trains reset with it.

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
| **Fall** | Vintage steam train around the guest house, autumn colours. 4 police. | Ride the train: climb on, run the roofs, duck under a footbridge and through a tunnel, hide between carriages from two officers on the halt platform | Cross the tracks: three timed level crossings; a passing train blocks the signal-box officer's view | Leaf path: piles hide pits or hiding places; wind gusts reveal them (and expose hidden players) |
| **Winter** | Snow, slippery everywhere. 4 police. Ends at the guest house (level complete). | Ski slope: on skis, auto-run downhill (→ faster, ← slower), jump rocks and pines, outrun two police skiers | Ski jump: full speed off the ramp, hold Jump to glide over a big gap | Blizzard: view shrinks to a circle, police cones shrink, footprints give you away (police follow them); hide in huts and drifts |

### One shared engine (hard rule)
- There is **one engine**: `Player`, police, hiding, lives, hurdles, HUD, level building. It never special-cases a season.
- **A season = a config file (`src/seasons/<season>.js`) + a layout file (`src/seasons/layouts/<season>.js`).** Nothing else.
- **Every hurdle is a platformer section with one twist** (e.g. water fails you, low friction, moving carriages, low visibility). Never a separate mini-game with its own controls. Canoeing, swimming and skiing are still the same run/jump/hide controls, with the twist expressed through physics, hazards or hiding spots in config.
- If a twist needs new behaviour, add it to the shared engine as a generic, config-driven feature (e.g. "moving platforms", "visibility radius") that any season can use.

### Engine features available to every season (all config/layout driven)
| Feature | Layout / config keys | Used by |
|---|---|---|
| Ground at different heights, quarry rock style, pits, cliffs | `ground[{x,w,y?,kind?}]`, `pits`, `cliffs` | Summer quarry |
| Hazard water (fail on contact) vs swimmable water | `water[{x,w,swim?}]`, season `swim` | Spring stream, Summer river / lake |
| Swimming: float, Down = dive (hidden, uses breath), jump out from the surface | season `swim { breathSeconds, refillPerSec, speedMultiplier, diveSpeedMultiplier, diveDepth, relockAt }` | Summer lake |
| Moving platforms: `ferry` (waits for the rider) and `loop` (fades and restarts); the rider is carried and keeps the platform's momentum when jumping | `movers[{kind,mode,from,to,y,w,speed,phase?}]` | Summer canoe and logs |
| Obstacles: touching one fails the hurdle (forgiving hitbox) | `obstacles[{x,top,kind}]` | Summer river snags |
| Heat: standing still in the open sun drains stamina; any hiding spot is shade; empty = faint (−1 life) | `heatZones[{x,w}]`, season `heat { staminaSeconds, regenPerSec, warnAt, glareAlpha }` | Summer quarry |
| Hiding spots: narrow (tuck to centre) or wide/tiled (`w`), raised (`y`) | `hidingSpots[{x,kind,y?,w?}]`; textures by kind in `TextureFactory` | bush, flowers, overhang, reeds |
| Police on raised spots, cone aimed down, lookouts that just turn | `police[{..., y?, tiltDeg?, pauseMs?}]` (`from === to` = lookout) | Summer bridge and jetty |
| Per-season cone colours (for contrast with the scenery) | palette `cone`, `coneEdge` | Summer, Fall |
| Train: multi-carriage moving platform (`kind: 'train'`), roofs to run on, gaps between carriages are hiding spots that travel with it | `movers[{kind:'train',mode:'ferry',from,to,y,speed,carriages}]` | Fall ride |
| Overhead obstacles: duck (↓) to pass under while riding | `obstacles[{x,y,w,h,kind:'footbridge'\|'tunnel'}]` | Fall ride |
| Fixed officers (never turn) with longer cones; cones can aim up (negative tilt) | `police[{fixed, facing, lengthScale, tiltDeg}]` | Fall halt and signal box |
| Level crossings on a timetable: signal warns (red + bell), passing train is deadly and **blocks police vision** (cones are clipped by it) | `crossings[{x,w,periodMs,offsetMs,warnMs,passMs}]` | Fall tracks |
| Leaf piles that look alike: `pit` (fake ground over a gap), `hide`, `plain`; wind gusts thin them, revealing pits and exposing hidden players | `leafPiles[{x,w,kind,hole?}]`, season `wind { intervalMs, warnMs, gustMs, firstGustMs }` | Fall leaf path |
| Scenery structures | `structures[{kind:'rails'\|'trestle'\|'signalBox',x,w?}]`, platform `solid: false` | Fall |
| Low friction everywhere (slide, slow to stop) | season `physics.friction` (e.g. 0.22) | Winter |
| Smooth slopes the player sticks to; `launch` slopes are ski-jump ramps (jumping on one is a speed-based launch) | `slopes[{x,w,y1,y2,launch?}]` | Winter |
| Skis: auto-run right (→ faster, ← slower), stays on through the air; hold Jump after a launch to glide | `skiZones[{x,w}]`, season `ski { cruiseSpeed, minSpeed, maxSpeed, acceleration, airAcceleration, glideGravity }` | Winter |
| Ground obstacles on ground or slope: jump them | `obstacles[{x,kind:'pine'\|'rock',h?}]` | Winter |
| Blizzard: fog cuts view to a circle around the player; police cones shrink | `blizzardZones[{x,w}]`, season `blizzard { radius, fogColor, fogAlpha, policeVisibility, fadeDistance }` | Winter |
| Footprints that fade; police who see one follow the trail, search where it ends, return | `footprintZones[{x,w}]`, season `footprints { spacing, lifeMs }`, `POLICE.trackSpeedScale/trailStepRange/searchMs` | Winter |
| Officers on skis, faster patrols, standing on slopes (ground height follows the terrain) | `police[{skis, speedScale}]` | Winter |
| Guest house as the goal | `goal { kind: 'house' }` | Winter |
| Level difficulty also tightens hurdle timing: less breath and stamina, faster movers | `DifficultySystem.tuneSeason` × `hurdleTimingMultiplier` | all |

Player meters (stamina and breath) float above the player's head only while they matter (`src/ui/PlayerMeters.js`).

**Seasons must change the RULES, not just the visuals.** Movement, friction, visibility, hazards and hiding spots differ per season. Each season's config file in `src/seasons/` declares these differences.

### Police
- **Plain-clothes officers** in ordinary clothes (polo shirt, slacks). Their consistent tell in every season is **black sunglasses with a white glint**: keep it on any seasonal outfit so players learn to spot them.
- Each officer walks a **patrol route** between two x positions, pauses at each end, and turns around. Routes live in the season layout (`police`, plus `extraPolice` that is added one per `policeCountBonus` from level 2 on). A route can have `activateX`: the officer waits facing `waitFacing` until the player passes that x, which is how a teaching moment is staged.
- A **semi-transparent vision cone** shows in front of each officer. While the player is inside it and not hidden, a **detection meter** above the officer fills (yellow **?** then red **!** at `POLICE.alarmAt`), and the officer stops to stare. When it is full, the player is caught. It drains when the player is out of sight.
- Officer speed, cone length and detection time = **season config × level multipliers** (`DifficultySystem.policeSettings`). Cone length is also multiplied by the season's `visibility`. Shared behaviour constants are in `POLICE` in `src/config/game.js`.
- **Hiding:** standing in a hiding spot (bush, flower bed, train carriage, snow hut, under water, etc.) and pressing **Down** hides the player: they dim and tuck in. Police cannot see a hidden player. **Moving or jumping leaves the spot.**
- Getting caught costs a life and respawns the player at the start of the hurdle. All officers reset to their starting positions, and the player has a short grace period (`RESPAWN.graceMs`).
- Spring teaches hiding **with no text**: the first garden officer waits facing away, then turns and walks toward the player as they enter. His cone reaches the first bush.

### Lives
- Start Level 1 with **3 lives**. Lives are a number in **steps of 0.5** (`LivesSystem.snap`) and **never go below 0**.
- Getting caught or failing a hurdle: **−1 life**, respawn at the start of that hurdle. Feedback: screen shake, a brief flash, a sound (`caught`, `splash` or `hit`), and the lost heart drops out of the HUD.
- Each hurdle crossed: **+0.5 life**. Feedback: a chime, and a half heart flies from the player into its HUD slot, which pulses (`pop`).
- Lives **carry forward** from season to season (passed in the run data, shown on the season transition screen).
- Lives reach 0 → **GameOverScene**: "Try again" restarts the level from Spring with 3 lives; "Main menu" goes back.

### HUD (top of the screen, readable at a glance)
- Left: hearts (full / half / empty outline), plus "HIDDEN" while hiding.
- Centre: season icon + name, hurdle progress dots (● cleared, ◉ current, ○ upcoming), current hurdle name.
- Right: coin icon + saved coin total.

### Art style (one style for everything)
- **Simple flat shapes**, drawn in code (`src/art/`), no image files and no gradients on sprites.
- **Play layer** (player, police, hiding spots, vehicles, trees, props) has a **soft 1px outline in the shared ink** `INK = 0x3b2a20` (added automatically by `TextureFactory` to textures whose key matches `OUTLINED`). The **parallax background is flat with no outline**, so it reads as distance.
- **Each season has its own palette** in its season config (`palette`); the shapes, proportions and line style are shared. New textures draw from the palette, never hard-coded season colours.
- **UI** uses the same ink for panel borders and text strokes, the `UI.font`, cream panels `0xfff4e6`, gold highlight `0xffd54f`, and `UI.screenBg` behind menu-style screens. Text uses `textStyle()` from `src/ui/Hud.js`.
- The player always wears the navy coat, red scarf and brown hat; police always wear the sunglasses.

### Audio (Web Audio only, no files)
- `src/systems/AudioSystem.js`: one shared audio graph (master → music / SFX gains), so music continues across scenes and crossfades when the track changes.
- **Music**: looping step-sequencer tracks in `src/config/music.js` (patterns of note tokens). Spring gentle, Summer upbeat, Fall nostalgic with a train "chuff" rhythm, Winter slow and sparse bells, `room` for menu / hub / level complete. A season's track is its `music` key (default: the season key).
- **SFX** recipes in `src/config/audio.js`: jump, hide, suspect "?", alert "!", caught, hurdle cleared (chime), half life gained (heart), coin tick, season change, plus splash, dive, gasp, faint, bonk, bell, rumble, whoosh, launch, game over, select. Scenes and entities raise events (`player-jump`, `player-hide`, `police-suspect`, `police-alarm`, …) and `GameScene` plays the sound.
- **Settings**: music and SFX volume sliders + mute in `SettingsPanel` (menu, hub, pause menu). **M mutes anywhere** (with a toast). Saved in `settings`.

### Levels and coins
- Completing all 4 seasons finishes one level.
- At level end, remaining lives are redeemed for coins: **100 coins per full life, 50 per half life**, plus a small **speed bonus**.

### Guest house hub (`HubScene`)
Between levels the player returns to their room. The room (`src/art/Room.js`) is drawn from the upgrades owned and visibly changes with each: bare bed → patchwork quilt, nail on the wall → Four Seasons painting, frosted glass → curtains and a view, cold hearth → lit fire, plus rug and plants; the light warms as upgrades are added.
- **Shop** (data in `src/config/shop.js`), three tabs:
  1. *Room upgrades*: cosmetic progress.
  2. *Items* for the next level only (used up when it starts; kept on "Try again"): Disguise hat (slower detection), Running shoes (faster), Thermos (stamina and breath last longer), Map (a minimap of police routes and hiding spots for a few seconds at each season start). Item effects use the same dotted-path effects as perks (`src/systems/Effects.js`), applied by `ShopSystem`.
  3. *Hiding places*: permanent unlocks that add a hiding spot to one season's layout (garden shed, lakeside hut, hollow tree, ice cave).
- **Keys**: ← → tabs, ↑ ↓ choose, ENTER buy, N next level, ESC menu (M mutes anywhere). Settings button for volumes. Everything is clickable too.
- **Next level** starts `highestLevel` with the new difficulty, packed items and unlocked hiding places (`newLevelRunFromSave`).
- **Save** (`SaveSystem`, localStorage wrapped in try/catch, in-memory fallback if blocked): `coins`, `highestLevel`, `upgrades`, `items`, `hidingPlaces`, `settings { muted }`. The menu starts at the level reached and offers "Your room" once there is progress.

### Season transitions and perks
- After a season's goal, `SeasonTransitionScene` plays a 2–3 s animated change: the old season's particles and icon give way to the next season's, the sky and ground blend, then "❤ x 3.5 carried into Summer" with the hearts. ENTER skips the animation. Timings: `TRANSITION` in `src/config/game.js`.
- The player then **picks one perk** for the next season (3 cards; ←/→ + ENTER or click). Perks are data in `src/config/perks.js`: each effect multiplies or adds to a number in the season config by dotted path (e.g. `physics.friction`). `PerkSystem.apply` applies the perks chosen for that season; `run.perks` keeps the choices for the whole level. The HUD shows the active perk under the coins.
- After Winter, `LevelCompleteScene` tallies lives into coins (100 per life, 50 per half), adds the speed bonus, counts the total up, then goes to the Hub.

### Difficulty
Each new level increases police count, patrol speed, vision cone length and detection speed, and tightens hurdle timing. **Level 1 is deliberately easy for the judges.** All numbers live in `src/config/levels.js`:
- `policeCountBonus` adds officers from each layout's `extraPolice` list (every season has two).
- `patrolSpeedMultiplier`, `visionLengthMultiplier`, `detectionSpeedMultiplier` scale the season's police settings (`DifficultySystem.policeSettings`).
- `hurdleTimingMultiplier` (< 1 = harder) scales breath, stamina, moving-platform speed and level-crossing warning time (`DifficultySystem.tuneSeason`).
- Level 2 is noticeably harder (+1 officer, ~30% faster, ~25% longer cones, ~45% faster detection, 15% tighter timing).

### Controls
- Left / Right (or A / D): move. Space / Up (or W): jump. Down (or S): hide, duck, dive.
- **Remappable** (Settings → Controls): each action's first key can be rebound; `DEFAULT_CONTROLS` in `src/systems/Settings.js`. ESC, P, M and ENTER are reserved for menus.
- ESC or P: pause menu (Resume, Restart season, Settings, Quit to menu). M: mute anywhere.
- Key icons (`src/ui/KeyIcons.js`) always show the player's current key, never a hard-coded one.

### First minute (Spring teaches without words)
- The title screen shows the guest house on its hill with the seasons cycling behind it; buttons: Play, Settings, Credits (+ Your room once there is progress). Credits text: `src/config/credits.js`.
- Spring (`tutorial: true`) has **no instruction sentences**: no signs, no hint lines in banners. The first screen teaches by layout, with only key icons next to the action (`layout.keyHints`), which fade once used: walk (← →), jump a small log (jump key), a bush (hide key) right before the first officer turns and sweeps his cone over it, then Hurdle 1.
- Hiding-spot prompts everywhere are a key icon, not words.

### Accessibility (Settings)
- **Colour-blind mode**: vision cones get a ray pattern and a thick dark edge (rays double when alarmed); deadly water gets a hatch; obstacles get striped outlines (`colorBlindOverlay` from `LevelBuilder`). Level crossings always show a barrier arm (shape, not just lamp colour); the detection meter always uses "?" / "!".
- **Easy mode**: police detection × `EASY.detectionMultiplier`, +`EASY.extraLives` life when a level starts.
- **Screen shake** on/off: all shake goes through `GameScene.shake()`.
- Settings live in `Settings.current` (cached) and `Settings.update()` saves and emits `changed`, so the game reacts immediately (rebinding keys, colour-blind overlay).

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
src/entities/           Player (run/jump/hide/swim/ski), Police, HidingSpot, Mover (canoe/log),
                        Train (multi-carriage mover)
src/systems/            LevelBuilder (layout → terrain/hazards/triggers), HurdleSystem
                        (start/end trigger zones, checkpoints), HeatSystem (stamina),
                        CrossingSystem (timed level crossings, vision blockers),
                        LeafSystem (leaf piles, wind gusts), SlopeSystem (slopes, ramps),
                        BlizzardSystem (fog, snow), FootprintSystem (trails police follow),
                        PerkSystem (applies chosen perks to a season config),
                        ShopSystem (items + unlocked hiding places), Effects (shared),
                        Settings (cached settings, controls, change events),
                        LivesSystem, SaveSystem,
                        AudioSystem, DifficultySystem
src/art/                TextureFactory (all sprites drawn in code), Backdrop (parallax),
                        Room (the hub room, drawn from owned upgrades)
src/ui/                 Hud (hearts, season icon, hurdle dots, coins, banners, reward effects),
                        SettingsPanel (volumes, mute, shake, colour-blind, easy, controls),
                        PauseMenu (resume, restart season, settings, quit), KeyIcons,
                        PlayerMeters (stamina/breath bars above the player)
src/systems/RunState.js newLevelRun(): the run data passed between scenes
src/config/game.js      global tunables (lives, coins, player feel, camera, respawn, UI, depths)
src/config/levels.js    difficulty numbers per level
src/config/audio.js     synthesised sound-effect recipes + volume
src/config/music.js     looping music tracks (note patterns) per season + room
src/config/perks.js     season perks offered on the transition screen
src/config/shop.js      room upgrades, items, hiding places (prices, effects)
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
- `window.__game` and `window.__audio` expose the Phaser game and the audio engine for debugging/automated playtests. Set `DEBUG.physics` in `src/config/game.js` to see bodies and trigger zones.

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
