const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const wwwDir = path.join(rootDir, 'www');

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

const files = [
  'index.html',
  'styles.css',
  'app.js',
  'levels.js',
  'shikaku-engine.js',
  'audio.js',
  'icon.svg',
  'manifest.json',
  'sw.js'
];

files.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    // Also mirror to root for direct Pages serving
    fs.copyFileSync(src, path.join(rootDir, file));
    console.log(`Copied ${file} -> www/ and root`);
  }
});

// Write .nojekyll in www and root
fs.writeFileSync(path.join(wwwDir, '.nojekyll'), '');
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');
console.log('ZenShikaku build completed successfully!');
