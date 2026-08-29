// Starts a Cloudflare quick tunnel for one local port and publishes the public
// URL to .preview/<name>.url so the preview dev servers can pick it up.
//
// Driven by the "tunnel" script in Backend/ (name=api) and Frontend/ (name=web),
// which turbo runs as switchable panes via `turbo run tunnel dev:preview`.
//
//   node scripts/tunnel.js --name <api|web> --port <port>

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const args = parseArgs(process.argv.slice(2));
if (!args.name || !args.port) {
  console.error("usage: node scripts/tunnel.js --name <api|web> --port <port>");
  process.exit(1);
}
const { name, port } = args;

const repoRoot = path.join(__dirname, "..");
const previewDir = path.join(repoRoot, ".preview");
fs.mkdirSync(previewDir, { recursive: true });
const urlFile = path.join(previewDir, `${name}.url`);

// Clear any stale URL from a previous run so consumers wait for the fresh one.
fs.rmSync(urlFile, { force: true });

const cloudflared = resolveCloudflared();
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

console.log(`[tunnel:${name}] starting cloudflared for http://localhost:${port} ...`);
const child = spawn(cloudflared, ["tunnel", "--url", `http://localhost:${port}`], {
  stdio: ["ignore", "pipe", "pipe"],
});

let published = false;
function scan(buf) {
  const text = buf.toString();
  process.stdout.write(text);
  if (published) return;
  const m = text.match(URL_RE);
  if (!m) return;
  published = true;
  fs.writeFileSync(urlFile, m[0]);
  console.log(
    `\n[tunnel:${name}] ✔ public URL: ${m[0]}` +
      `\n[tunnel:${name}]   wrote ${path.relative(repoRoot, urlFile)}\n`
  );
}
child.stdout.on("data", scan);
child.stderr.on("data", scan);

child.on("error", (err) => {
  console.error(
    `[tunnel:${name}] could not launch cloudflared (${err.message}).` +
      ` Install it: winget install --id Cloudflare.cloudflared`
  );
  process.exit(1);
});

child.on("exit", (code) => {
  fs.rmSync(urlFile, { force: true });
  console.log(`[tunnel:${name}] cloudflared exited (${code ?? 0})`);
  process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    try {
      child.kill();
    } catch {}
  });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--name") out.name = argv[++i];
    else if (argv[i] === "--port") out.port = Number(argv[++i]);
  }
  return out;
}

function resolveCloudflared() {
  const win = "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";
  if (process.platform === "win32" && fs.existsSync(win)) return win;
  return "cloudflared";
}
