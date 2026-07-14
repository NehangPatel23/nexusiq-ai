import { access, constants } from "fs/promises";
import path from "path";

export type DiskHealth =
  | {
      availableBytes?: number;
      totalBytes?: number;
      path: string;
      note?: string;
    }
  | {
      path?: string;
      note: string;
    };

/**
 * Localhost: try fs.statfs on STORAGE_PATH.
 * Vercel / serverless: ephemeral disk is N/A — callers should surface a note.
 */
export async function getDiskHealth(): Promise<DiskHealth> {
  if (process.env.VERCEL) {
    return {
      note: "Serverless ephemeral — N/A. Use Postgres document storage aggregate instead.",
    };
  }

  const storagePath = path.resolve(process.env.STORAGE_PATH ?? "./storage");

  try {
    await access(storagePath, constants.F_OK).catch(async () => {
      // Path may not exist yet; still try parent / resolve for capacity.
    });
  } catch {
    // ignore
  }

  try {
    // Node 18.15+ / 20+: fs.promises.statfs
    const { statfs } = await import("fs/promises");
    if (typeof statfs !== "function") {
      return { path: storagePath, note: "statfs unavailable on this Node runtime" };
    }
    const stats = await statfs(storagePath);
    const blockSize = Number(stats.bsize);
    const availableBytes = Number(stats.bavail) * blockSize;
    const totalBytes = Number(stats.blocks) * blockSize;
    return {
      path: storagePath,
      availableBytes: Number.isFinite(availableBytes) ? availableBytes : undefined,
      totalBytes: Number.isFinite(totalBytes) ? totalBytes : undefined,
    };
  } catch (error) {
    return {
      path: storagePath,
      note:
        error instanceof Error
          ? `Unable to read disk stats: ${error.message}`
          : "Unable to read disk stats",
    };
  }
}
