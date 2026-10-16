// Shared helpers for placeholder screens.

export function addScreenText(scene, title, lines = []) {
  const { width, height } = scene.scale;
  scene.add
    .text(width / 2, height / 2 - 60, title, { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' })
    .setOrigin(0.5);
  scene.add
    .text(width / 2, height / 2 + 20, lines.join('\n'), {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#dddddd',
      align: 'center',
      lineSpacing: 8,
    })
    .setOrigin(0.5);
}

export function onKey(scene, keyName, callback) {
  scene.input.keyboard.once(`keydown-${keyName}`, callback);
}
