import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import type { StorageAdapter } from "./types";

function resolveObjectPath(root: string, key: string): string {
  const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolute = path.resolve(root, normalizedKey);
  const rootResolved = path.resolve(root);

  if (!absolute.startsWith(`${rootResolved}${path.sep}`) && absolute !== rootResolved) {
    throw new Error("Invalid storage key");
  }

  return absolute;
}

export function createLocalStorageAdapter(basePath?: string): StorageAdapter {
  const root = path.resolve(basePath ?? process.env.STORAGE_PATH ?? "./storage");

  return {
    async putObject(key, data, _contentType) {
      const filePath = resolveObjectPath(root, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, data);
    },

    async getObject(key) {
      return readFile(resolveObjectPath(root, key));
    },

    async deleteObject(key) {
      await unlink(resolveObjectPath(root, key)).catch(() => undefined);
    },

    async getSignedUrl() {
      throw new Error("Signed URLs are not supported for local storage");
    },
  };
}
