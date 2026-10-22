import fs from "fs/promises";
import path from "path";

export function projectRoot() {
  return process.cwd();
}

export function storageRoot() {
  return path.resolve(projectRoot(), process.env.STORAGE_DIR || "storage");
}

export function assertId(id: string) {
  if (!/^[a-zA-Z0-9_-]{8,40}$/.test(id)) throw new Error("Invalid id");
  return id;
}

export function assertInside(root: string, target: string) {
  const base = path.resolve(root);
  const resolved = path.resolve(target);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error("That path is not allowed.");
  }
  return resolved;
}

export function videoFolder(id: string) {
  return path.join(storageRoot(), "videos", assertId(id));
}

export function safeProjectFile(relativePath: string) {
  if (!relativePath || relativePath.includes("\0")) throw new Error("Invalid file");
  return assertInside(projectRoot(), path.resolve(projectRoot(), relativePath));
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
