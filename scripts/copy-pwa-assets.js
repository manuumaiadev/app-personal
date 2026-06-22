const { copyFileSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const dist = join(root, 'dist');

const copies = [
  { src: join(root, 'public', 'manifest.json'), dest: join(dist, 'manifest.json') },
  { src: join(root, 'assets', 'icon-app.png'), dest: join(dist, 'apple-touch-icon.png') },
];

copies.forEach(({ src, dest }) => {
  if (!existsSync(src)) {
    console.warn(`Aviso: arquivo nao encontrado: ${src}`);
    return;
  }
  copyFileSync(src, dest);
  console.log(`Copiado: ${dest}`);
});
