import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Not authenticated");
  return user;
}

// Resolves the caller's membership, verifying access server-side — never trust
// a client-supplied workspaceId without this check. Omit workspaceId to get
// the caller's default (first-joined) workspace.
export const requireWorkspaceAccess = cache(async (workspaceId?: string) => {
  const user = await requireCurrentUser();
  const membership = await db.workspaceMember.findFirst({
    where: workspaceId ? { userId: user.id, workspaceId } : { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  if (!membership) {
    throw new UnauthorizedError("No access to this workspace");
  }
  return membership;
});
