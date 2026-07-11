import { createClient } from "@supabase/supabase-js";

import type { StorageAdapter } from "./types";

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function documentsBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS?.trim() || "documents";
}

export function createSupabaseStorageAdapter(): StorageAdapter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error("Supabase Storage is not configured");
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucket = documentsBucket();

  return {
    async putObject(key, data, contentType) {
      const { error } = await client.storage.from(bucket).upload(key, data, {
        contentType: contentType ?? "application/octet-stream",
        upsert: true,
      });

      if (error) {
        throw new Error(error.message);
      }
    },

    async getObject(key) {
      const { data, error } = await client.storage.from(bucket).download(key);

      if (error || !data) {
        throw new Error(error?.message ?? "Object not found");
      }

      return Buffer.from(await data.arrayBuffer());
    },

    async deleteObject(key) {
      const { error } = await client.storage.from(bucket).remove([key]);
      if (error) {
        throw new Error(error.message);
      }
    },

    async getSignedUrl(key, expiresInSeconds) {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(key, expiresInSeconds);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Failed to create signed URL");
      }

      return data.signedUrl;
    },
  };
}
