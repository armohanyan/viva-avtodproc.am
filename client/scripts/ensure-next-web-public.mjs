/**
 * Legacy helper retained for older checkouts that still use `apps/web/public`.
 * Current structure keeps standalone assets in `client/marketing/public`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "..");
const webPublic = path.join(clientRoot, "marketing", "public");
const targetDir = path.join(clientRoot, "marketing", "public");

function createLink() {
  if (process.platform === "win32") {
    fs.symlinkSync(path.resolve(targetDir), webPublic, "junction");
  } else {
    fs.symlinkSync(path.relative(path.dirname(webPublic), targetDir), webPublic, "dir");
  }
}

function main() {
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.warn("ensure-next-web-public: marketing/public is missing; skip.");
    return;
  }
  if (!fs.existsSync(webPublic)) {
    createLink();
    return;
  }
  try {
    if (fs.realpathSync(webPublic) === fs.realpathSync(targetDir)) return;
  } catch {
    /* continue */
  }

  const st = fs.lstatSync(webPublic);
  if (st.isFile()) {
    fs.unlinkSync(webPublic);
    createLink();
    return;
  }

  if (st.isSymbolicLink()) {
    fs.rmSync(webPublic, { recursive: true, force: true });
    createLink();
    return;
  }

  if (st.isDirectory()) {
    const entries = fs.readdirSync(webPublic);
    if (entries.length === 0) {
      fs.rmSync(webPublic, { recursive: true, force: true });
      createLink();
      return;
    }
    console.warn(
      "ensure-next-web-public: marketing/public is a non-empty folder; leave as-is.",
    );
  }
}

main();
