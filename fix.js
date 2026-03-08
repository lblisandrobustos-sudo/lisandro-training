const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'docs', 'agustina-clavijo', 'index.html');
let h = fs.readFileSync(file, 'utf8');

const antes = h.length;

h = h.replace(".replace(/&/g, '&amp;')",   ".replace(/&/g, '&' + 'amp;')");
h = h.replace('.replace(/"/g, \'&quot;\')', '.replace(/"/g, \'&\' + \'quot;\')');
h = h.replace(".replace(/</g, '&lt;')",    ".replace(/\\x3C/g, '&' + 'lt;')");
h = h.replace(".replace(/>/g, '&gt;')",    ".replace(/\\x3E/g, '&' + 'gt;')");

fs.writeFileSync(file, h, 'utf8');

const ok = h.includes('x3C') && h.includes("'&' + 'amp;'");
console.log(ok ? '✅ index.html corregido correctamente' : '❌ Algo falló');
console.log('Tamaño:', antes, '->', h.length, 'bytes');
