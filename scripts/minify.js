const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : entry.name.endsWith('.js') ? [file] : [];
  });
}

async function run() {
  await Promise.all(filesIn(path.resolve(__dirname, '../dist')).map(async file => {
    const output = await minify(fs.readFileSync(file, 'utf8'), {
      compress: { passes: 2, toplevel: true },
      mangle: { toplevel: true },
      format: { comments: false },
    });
    if (!output.code) throw new Error(`Terser produced no output for ${file}`);
    fs.writeFileSync(file, output.code);
  }));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
