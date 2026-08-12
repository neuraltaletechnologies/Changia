// Runs the Changia backend API and frontend dev servers together.
// Usage: npm run dev   (from the repo root)
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const children = [];

function run(name, cwd, command, args) {
  const dir = path.join(root, cwd);
  console.log(`\n[changia] starting ${name}: ${command} ${args.join(' ')}  (in ${cwd})\n`);
  const child = spawn(command, args, { cwd: dir, stdio: 'inherit' });
  children.push(child);

  child.on('exit', (code) => {
    console.log(`\n[changia] ${name} exited with code ${code}`);
    // Stop the other server when either one stops.
    for (const other of children) {
      if (other !== child && !other.killed) other.kill();
    }
  });
}

run('backend API (http://localhost:5000)', 'backend', 'node', ['--watch', 'server.js']);
run('frontend web (http://localhost:3000)', 'Frontend', 'npm', ['run', 'dev']);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) {
      if (!child.killed) child.kill();
    }
    process.exit(0);
  });
}
