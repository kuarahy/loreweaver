const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('js/sample-data.js', 'utf8');
const sandbox = {};
vm.runInNewContext(src + '\nsandbox.SAMPLE_WORLD = SAMPLE_WORLD;', { sandbox });
fs.mkdirSync('samples', { recursive: true });
fs.writeFileSync('samples/sword-coast.loreweaver.json', JSON.stringify(sandbox.SAMPLE_WORLD, null, 2));
console.log('Wrote samples/sword-coast.loreweaver.json');
