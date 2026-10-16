# Credits

**Hill Station Hideout** was made in 24 hours for the "Four Seasons" game jam.

## Team

Design, code, art and music: the Hill Station Hideout team.

**All art and audio were made by the team during the event.** There are no downloaded or pre-made assets:

- Every sprite, background, icon and screen is painted in code at runtime with the browser's Canvas 2D API and Phaser (`src/art/`): gradients, shading, particles and lighting overlays. No image files.
- All music and sound effects are synthesised live with the browser's Web Audio API from note patterns and sound recipes written for this game (`src/config/music.js`, `src/config/audio.js`).

## Third-party software

| What | Version | Licence | How it is used |
|---|---|---|---|
| [Phaser](https://phaser.io) | 3.80.1 | [MIT](https://github.com/phaserjs/phaser/blob/v3.80.1/LICENSE.md) | Game framework, loaded at runtime from the jsDelivr CDN (`https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`). Not modified or redistributed in this repository. |
| [jsDelivr](https://www.jsdelivr.com) | n/a | Free public CDN | Serves the Phaser file above. |
| [Lora](https://fonts.google.com/specimen/Lora) | Google Fonts | [SIL Open Font License 1.1](https://openfontlicense.org) | Title font, loaded at runtime from Google Fonts. Not redistributed in this repository. |
| [Nunito](https://fonts.google.com/specimen/Nunito) | Google Fonts | [SIL Open Font License 1.1](https://openfontlicense.org) | Text and number font, loaded at runtime from Google Fonts. Not redistributed in this repository. |

Phaser's MIT licence: Copyright © Phaser Studio Inc. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, subject to including the copyright notice and permission notice in all copies or substantial portions of the Software. The software is provided "as is", without warranty of any kind. See the full text at the link above.

## Fonts

No font files are included in the repository. **Lora** (titles) and **Nunito** (text and numbers) are loaded from Google Fonts (SIL Open Font License 1.1). If they cannot load, the game falls back to **Georgia** / **Trebuchet MS** or the system fonts. A few UI icons are emoji characters, drawn by the player's own system emoji font.

## Tools

- A plain text editor and a local static web server (`python3 -m http.server`) for development.
- Hosting: GitHub Pages.
