const { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const dist = join(root, 'dist');

// Copia manifest.json
const manifestSrc = join(root, 'public', 'manifest.json');
if (existsSync(manifestSrc)) {
  copyFileSync(manifestSrc, join(dist, 'manifest.json'));
  console.log('Copiado: manifest.json');
}

// Copia apple-touch-icon
const iconSrc = join(root, 'assets', 'icon-app.png');
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, join(dist, 'apple-touch-icon.png'));
  console.log('Copiado: apple-touch-icon.png');
}

// Copia Ionicons direto de node_modules (mais confiavel que procurar em dist/assets/)
// ExpoFontLoader.web.js so reconhece fontes dentro de <style id="expo-generated-fonts">
const ioniconsNodeModules = join(
  root,
  'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'
);
if (existsSync(ioniconsNodeModules)) {
  const fontsDir = join(dist, 'fonts');
  mkdirSync(fontsDir, { recursive: true });
  copyFileSync(ioniconsNodeModules, join(fontsDir, 'ionicons.ttf'));
  console.log('Copiado: fonts/ionicons.ttf');

  const indexPath = join(dist, 'index.html');
  let html = readFileSync(indexPath, 'utf-8');
  const fontFaceTag = `<style id="expo-generated-fonts">@font-face{font-family:ionicons;src:url("/fonts/ionicons.ttf") format("truetype");font-display:block}</style>`;
  html = html.replace('</head>', `${fontFaceTag}\n</head>`);
  writeFileSync(indexPath, html);
  console.log('Injetado: @font-face ionicons em index.html');
} else {
  console.warn('Aviso: Ionicons.ttf nao encontrado em node_modules');
}
