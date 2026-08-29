// Waits for the Cloudflare tunnel URLs (written by scripts/tunnel.js), injects
// the public URLs into the environment, then runs the real dev command.
//
// This is what lets the preview run entirely inside the turbo TUI: the tunnel
// panes come up first, publish their URLs, and these wrappers unblock and boot
// the servers already pointed at the public URLs — no .env file patching.
//
//   node scripts/preview-run.js --target <api|web> -- <command> [args...]

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const opts = argv.slice(0, sep === -1 ? argv.length : sep);
const cmd = sep === -1 ? [] : argv.slice(sep + 1);
const target = opts[opts.indexOf("--target") + 1];

if (!["api", "web"].includes(target) || cmd.length === 0) {
  console.error("usage: node scripts/preview-run.js --target <api|web> -- <command> ...");
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..");
const previewDir = path.join(repoRoot, ".preview");
const apiUrlFile = path.join(previewDir, "api.url");
const webUrlFile = path.join(previewDir, "web.url");
const TIMEOUT_MS = 120_000;

(async () => {
  console.log(`[preview:${target}] waiting for tunnel URLs (.preview/*.url) ...`);
  const started = Date.now();
  let apiUrl;
  let webUrl;
  for (;;) {
    apiUrl = read(apiUrlFile);
    webUrl = read(webUrlFile);
    if (apiUrl && webUrl) break;
    if (Date.now() - started > TIMEOUT_MS) {
      console.error(
        `[preview:${target}] timed out after ${TIMEOUT_MS / 1000}s waiting for tunnels.` +
          ` Check the tunnel panes — is cloudflared installed?`
      );
      process.exit(1);
    }
    await sleep(500);
  }
  console.log(`[preview:${target}] api=${apiUrl}  web=${webUrl}`);

  const env = { ...process.env };
  if (target === "api") {
    // dotenv.config() does not override vars already in process.env, so these win.
    env.API_PUBLIC_URL = apiUrl;
    env.APP_BASE_URL = webUrl;
    env.CORS_ORIGINS = [webUrl, "http://localhost:3000", "http://localhost:3001"].join(",");
  } else {
    env.NEXT_PUBLIC_API_URL = `${apiUrl}/api/v1`;
  }

  const child = spawn(cmd[0], cmd.slice(1), { stdio: "inherit", shell: true, env });
  child.on("exit", (code) => process.exit(code ?? 0));
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      try {
        child.kill();
      } catch {}
    });
  }
})();

function read(file) {
  try {
    return fs.readFileSync(file, "utf8").trim() || null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
