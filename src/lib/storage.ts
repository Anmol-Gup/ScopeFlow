import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

// A company logo should never need to be more than a couple hundred KB;
// 2MB is already generous headroom for an uncompressed PNG.
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export function isAllowedLogoType(mimeType: string) {
  return mimeType in LOGO_EXTENSIONS;
}

// One logo per workspace, deterministically named so re-uploading replaces
// it in place rather than accumulating orphaned files. The extension can
// change between uploads (e.g. .png -> .jpg), so the caller must delete the
// previous file first via deleteWorkspaceBrandingLogo before saving a new one.
export async function saveWorkspaceBrandingLogo(
  workspaceId: string,
  file: File
): Promise<{ storedFilename: string }> {
  const ext = LOGO_EXTENSIONS[file.type];
  if (!ext) {
    throw new Error("Unsupported image type. Upload a PNG, JPEG, WEBP, or SVG file.");
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("Logo is too large (max 2MB).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedFilename = `logo${ext}`;
  const workspaceDir = path.join(STORAGE_ROOT, workspaceId, "branding");
  await mkdir(workspaceDir, { recursive: true });
  await writeFile(path.join(workspaceDir, storedFilename), buffer);

  return { storedFilename };
}

export async function deleteWorkspaceBrandingLogo(workspaceId: string, storedFilename: string) {
  try {
    await unlink(path.join(STORAGE_ROOT, workspaceId, "branding", storedFilename));
  } catch {
    // Already gone — nothing to do.
  }
}

export async function readWorkspaceBrandingLogo(workspaceId: string, storedFilename: string) {
  return readFile(path.join(STORAGE_ROOT, workspaceId, "branding", storedFilename));
}
