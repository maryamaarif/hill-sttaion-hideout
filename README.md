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
| ← → / A D | Move |
| ↑ / W / Space | Jump |
| ↓ / S | Hide at a hiding spot / dive |
| Enter | Confirm on menus |

### Skeleton test keys (temporary)

While the game is a skeleton, each scene shows which key moves on to the next one:

- **Menu**: Enter starts the game
- **Game**: N finishes the current season, G triggers game over
- **Season transition / Level complete / Hub / Game over**: Enter continues

## Deploy to GitHub Pages

Push to GitHub, then go to **Settings → Pages → Deploy from branch → `main` / root**. All paths are relative, so the game works from the Pages sub-path.

## Project layout

See [CLAUDE.md](CLAUDE.md) for the full design and code structure.
