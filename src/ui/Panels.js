// Rounded wooden UI panels (painted in TextureFactory at 2×, stretched with a
// nine-slice so corners and grain stay crisp at any size).
//   'wood'   dark wooden board          (HUD plaques, dialogs)
//   'paper'  wooden frame, paper inside (menus, settings, cards)
//   'plank'  light plank button         (tint it to highlight)
//   'key'    keycap
const SLICES = {
  wood: { key: 'ui-wood', corner: 16 },
  paper: { key: 'ui-paper', corner: 16 },
  plank: { key: 'ui-plank', corner: 12 },
  key: { key: 'ui-key', corner: 10 },
};
const ART = 2;
export const HOT_TINT = 0xffd36a;

// A panel of logical size w×h. Returns the NineSlice; use setPanelScale() rather
// than setScale() to grow/shrink it (it is drawn at 1/ART_SCALE).
export function addPanel(scene, x, y, w, h, kind = 'paper') {
  const { key, corner } = SLICES[kind];
  const c = corner * ART;
  const panel = scene.add.nineslice(x, y, key, null, Math.max(w * ART, c * 2 + 2), Math.max(h * ART, c * 2 + 2), c, c, c, c);
  panel.setScale(1 / ART);
  panel.setPanelScale = (s) => panel.setScale(s / ART);
  return panel;
}

// Highlight for buttons: a warm golden tint over the plank.
export function setHot(panel, on) {
  if (on) panel.setTint(HOT_TINT);
  else panel.clearTint();
  return panel;
}
