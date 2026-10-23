const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
for (const file of ['index.html', 'trainer.html']) {
  fs.copyFileSync(path.join(root, file), path.join(root, 'public', file));
}
console.log('Built student and trainer pages.');
