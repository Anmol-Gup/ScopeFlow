import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readWorkspaceBrandingLogo } from "@/lib/storage";

// Intentionally public, no auth — a company logo is meant to appear on the
// client-facing public proposal/quotation pages, so it must be fetchable by
// an unauthenticated visitor. It exposes nothing beyond the logo image
// itself (no workspace name/settings/internal data).
export async function GET(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;

  const branding = await db.workspaceBranding.findUnique({
    where: { workspaceId },
    select: { logoFilename: true, logoMimeType: true },
  });
  if (!branding?.logoFilename || !branding.logoMimeType) {
    return NextResponse.json({ error: "No logo configured" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readWorkspaceBrandingLogo(workspaceId, branding.logoFilename);
  } catch {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": branding.logoMimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
