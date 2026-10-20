// Gera standalone.cjs (CommonJS + UI embutida) a partir de server.js, para o Node SEA.
const fs = require('node:fs');

let s = fs.readFileSync('server.js', 'utf8').replace(/^#!.*\n/, '');
const ui = fs.readFileSync('ui.html', 'utf8');

// import { a, b as c } from 'm';  ->  const { a, b: c } = require('m');
s = s.replace(/^import \{([^}]+)\} from '([^']+)';$/gm, (_, nomes, mod) => {
  if (mod === 'node:url') return '';
  const lista = nomes
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n && n !== 'createReadStream' && n !== 'dirname' && n !== 'fileURLToPath')
    .map((n) => n.replace(/\s+as\s+/, ': '));
  return `const { ${lista.join(', ')} } = require('${mod}');`;
});
s = s.replace(/const AQUI = dirname\(fileURLToPath\(import\.meta\.url\)\);/, 'const AQUI = process.cwd();');
s = s.replace(
  /res\.writeHead\(200, \{ 'Content-Type': 'text\/html; charset=utf-8' \}\);\s*\n\s*createReadStream\(join\(AQUI, 'ui\.html'\)\)\.pipe\(res\);/,
  "res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(UI_HTML);",
);

if (/\bimport\b.*from|import\.meta|createReadStream\(/.test(s)) {
  throw new Error('build: sobrou import ESM/createReadStream no bundle');
}
fs.writeFileSync(
  'standalone.cjs',
  `// BUNDLE CJS STANDALONE (Node SEA). Gerado por build.cjs.\nconst UI_HTML = ${JSON.stringify(ui)};\n${s}`,
);
console.log('standalone.cjs', fs.statSync('standalone.cjs').size, 'bytes');
