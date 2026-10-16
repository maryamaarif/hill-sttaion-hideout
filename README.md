# Hill Station Hideout

**▶ Play it here: <https://maryamaarif.github.io/hill-sttaion-hideout/>**

A side-scrolling stealth platformer made in 24 hours for the **"Four Seasons"** game jam.

You are a guest at a guest house in a hill station, and plain-clothes police (look for the sunglasses) are searching for you. Keep moving through the activities around the guest house through spring, summer, fall and winter, and stay out of sight. Each season is a stage with three hurdles. Clear a hurdle to earn half a life, get caught or fall and you lose one. Lives carry from season to season, and at the end of the level they turn into coins for your room at the guest house.

Level 1 takes about 4–6 minutes and is deliberately gentle.

## How the four seasons change the gameplay

The seasons change the **rules**, not just the colours. The controls stay the same throughout.

| Season | What changes | Hurdles |
|---|---|---|
| **Spring** | Normal footing, slow patrols. Teaches the game without words: walk, jump, hide in a bush as a police officer's vision cone sweeps past. | Meadow walk · stepping stones over a stream · a flower garden with two patrols |
| **Summer** | **Heat:** standing still in the sun drains stamina, so you keep moving between shady rock overhangs. **Water:** ride a drifting canoe, then swim; diving hides you but uses breath. | Quarry gaps in the heat · canoe run past a bridge lookout (hide in the reeds) · lake swim under the jetty officer's gaze |
| **Fall** | **The vintage train:** a moving platform you ride on the roof, ducking under bridges and hiding between carriages. **Timetables:** level-crossing trains are deadly but block police vision. **Wind:** gusts reveal what is hidden under the leaf piles. | Ride the train · cross the tracks · leaf path (some piles hide holes, some hide you) |
| **Winter** | **Slippery** ground everywhere. **Skis:** you auto-run downhill (→ faster, ← slower). **Blizzard:** fog shrinks your view to a circle, police cones shrink too, and your **footprints** give you away. Police follow them. | Ski slope with police skiers · ski jump (full speed, hold jump to glide) · blizzard to the guest house |

**Every season sounds, leaves traces and behaves differently.**

| | Spring | Summer | Fall | Winter |
|---|---|---|---|---|
| Your footsteps (police inside the ring turn to look) | splash in puddles | crunch on gravel | rustle loudly in the leaves | quiet in the snow |
| What you leave behind | wet prints that dry fast | nothing | scattered leaves | deep prints police follow |
| Weather event (about 10 s) | a shower: police open umbrellas and see less | a heatwave: stamina drains fast | a wind gust: leaves blow off pits and hiders | a blizzard: you only see a circle |
| The guest house on the hill | flower boxes | open windows, a parasol | pumpkins, firewood | snow on the roof, chimney smoke |
| Other guests (walk beside them to blend into the crowd) | picnickers | sunbathers and swimmers | train passengers | skiers |

**Clothes change the rules too.** Each season dresses you for the weather, and your outfit matters: a raincoat and umbrella you can float with in Spring, light summer clothes for the fastest run (a life jacket in the canoe, a swimsuit and goggles in the lake), an earthy autumn sweater that blends into the trees, and a puffer jacket that keeps the winter cold at bay (watch the cold meter in the blizzard). The plain-clothes police change their disguise every season too: tourists, beachgoers, train passengers, skiers. The one thing that always gives them away is their mirrored sunglasses and earpiece.

Between seasons you choose a **perk** for the next one (e.g. *Warm coat: less slip in Winter*). In your **room** you spend coins on room upgrades (the room visibly changes), items for the next level (disguise hat, running shoes, thermos, map), extra hiding places in the seasons, and new outfits (a colour variant and a camouflage outfit per season). Each new level is noticeably harder.

## Look, sound and feel

- **Visuals.** Everything is painted in code in one painterly, lean-realistic style: leaf-by-leaf trees, layered rock, snowy spruces, volumetric clouds, mountains lit from the sun, five parallax layers, animated water, soft shadows and a seasonal lighting grade. The guest house on the hill dresses for each season.
- **Outfits.** You and the plain-clothes police change clothes every season (with a spin and a puff of the new season's particles on the transition screen), and the room shop sells a colour variant and a camouflage outfit per season.
- **Music.** One shared melody, arranged per season: a light flute in Spring, marimba and plucked guitar in Summer, accordion and piano with a steam-train rhythm in Fall, slow bells and strings in Winter, and solo piano in your room. A tense layer of pulsing strings and a heartbeat fades in while an officer's detection meter fills, and fades away when you hide.
- **Soundscape.** Generated ambience per season (birdsong and spring rain, cicadas and lapping water, wind and a distant train whistle, howling winter wind) that swells during the weather event, and footsteps that change with the ground: grass, puddles, gravel, wood, stone, leaves and snow.
- **Game feel.** A smooth look-ahead camera that eases out on the train roofs and the ski jump, squash and stretch on jumps and landings with a puff of the season's ground, a hit-stop when you're caught, a slow-motion beat when you clear a hurdle, and a time-lapse of the hillside between seasons.

## Controls

| Key | Action |
|---|---|
| ← → / A D | Move (on skis: faster / slower) |
| Space / ↑ / W | Jump (hold after a ski jump to glide) |
| ↓ / S | Hide in a hiding spot (move or jump to leave), duck, dive when swimming |
| ↑ / W (held in the air) | Spring umbrella: float down slowly |
| Esc / P | Pause: Resume, Restart season, Settings, Quit to menu |
| M | Mute or unmute, anywhere |
| Enter / click | Confirm on menus |

Movement keys can be remapped in **Settings → Controls**.

**Accessibility:** a colour-blind mode (patterns and outlines on police vision cones and hazards), Easy mode (slower detection and an extra life), screen shake on/off, and music and sound-effect volume.

**For judges:** add `?demo=1` to the URL (<https://maryamaarif.github.io/hill-sttaion-hideout/?demo=1>) to start with 600 coins, then choose **Your room** on the title screen to try the shop.

## Run locally

There is nothing to install and no build step. Browsers block ES modules on `file://`, so serve the folder over HTTP:

```bash
git clone https://github.com/maryamaarif/hill-sttaion-hideout.git
cd hill-sttaion-hideout
python3 -m http.server 8000
```

Then open <http://localhost:8000> (or <http://localhost:8000/?demo=1>). Any static web server works.

Phaser 3.80.1 is loaded from a CDN and the Lora and Nunito fonts from Google Fonts, so the first load needs an internet connection (without the fonts the game falls back to system fonts). Progress and settings are saved in your browser (localStorage). If storage is blocked, the game still works for the session.

## Made with

Plain HTML and JavaScript with [Phaser 3.80.1](https://phaser.io). All art is painted in code at runtime and all music, ambience and sound effects are synthesised live with Web Audio, so there are no image or audio files. The only third-party pieces are Phaser and two Google Fonts (Lora and Nunito). See [CREDITS.md](CREDITS.md) for third-party software and licences, and [CLAUDE.md](CLAUDE.md) for the full design and code structure.
