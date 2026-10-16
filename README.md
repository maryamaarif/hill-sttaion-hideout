# Hill Station Hideout

A side-scrolling stealth platformer for the **"Four Seasons"** game jam. You are a guest at a hill-station guest house, and plain-clothes police are looking for you. Get through spring, summer, fall and winter without being spotted.

Built with plain HTML/JavaScript and [Phaser 3.80.1](https://phaser.io) from a CDN. There is no build step and nothing to install.

## Run locally

Browsers block ES modules on `file://`, so serve the folder over HTTP:

```bash
cd hill-sttaion-hideout
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

(Any static server works, e.g. `npx serve`.)

## Controls

| Key | Action |
|---|---|
| ← → / A D | Move (on skis: faster / slower) |
| ↑ / W / Space | Jump (hold after a ski jump to glide) |
| ↓ / S | Hide in a bush, flower bed, overhang or reeds (move or jump to leave); hold to dive when swimming |
| Enter | Confirm on menus |

### What's playable

- **Spring** is a full stage: three hurdles (Meadow Walk, Stepping Stones, Flower Garden), ending at the Garden Gate. Plain-clothes officers (look for the sunglasses) patrol the garden: stay out of their vision cones or hide.
- **Summer** is a full stage: a hot quarry (keep moving, rest in the shade), a canoe run past a bridge lookout, and a lake swim where you dive under the jetty officer's gaze.
- **Fall** is a full stage: ride a vintage steam train (duck under bridges, hide between carriages), time three level crossings, and cross a leaf path where the wind reveals hidden holes.
- **Winter** is a full stage: ski down the mountain past police skiers, fly the ski jump, then cross a blizzard where your footprints give you away, to reach the guest house.
- Between seasons you see how many lives you carry forward and pick one perk for the next season (e.g. *Warm coat: less slip in Winter*).
- Finishing Winter completes the level: lives turn into coins, then you return to your room. Level 2 and beyond are noticeably harder.
- Every screen shows which key continues.

## Deploy to GitHub Pages

Push to GitHub, then go to **Settings → Pages → Deploy from branch → `main` / root**. All paths are relative, so the game works from the Pages sub-path.

## Project layout

See [CLAUDE.md](CLAUDE.md) for the full design and code structure.
