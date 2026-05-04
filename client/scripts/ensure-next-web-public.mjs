/**
 * Next.js expects `apps/web/public` to be a directory (shared static assets live in `client/public`).
 * Git stores that path as a symlink; on Windows without symlink support it becomes a small text file.
 * Next then treats `join(public, '/')` as an existing *file* and serves it for `/`, which conflicts with `app/page.tsx`.
 * This script replaces a broken file (or wrong link) with a directory symlink / Windows junction.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "..");
const webPublic = path.join(clientRoot, "apps", "web", "public");
const targetDir = path.join(clientRoot, "public");

function createLink() {
  if (process.platform === "win32") {
    fs.symlinkSync(path.resolve(targetDir), webPublic, "junction");
  } else {
    fs.symlinkSync(path.relative(path.dirname(webPublic), targetDir), webPublic, "dir");
  }
}

function main() {
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.warn("ensure-next-web-public: client/public is missing; skip.");
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
      "ensure-next-web-public: apps/web/public is a non-empty folder not linked to client/public; leave as-is.",
    );
  }
}

main();
