import { db } from "@/lib/db";
import type { DocumentKind, DocumentStatus } from "@/generated/prisma/enums";

// Original vs Additional Scope is never stored on Requirement — it's
// derived from which ACCEPTED Quotation's snapshot a requirement appears
// in, so it can never drift out of sync with the documents themselves.
export type RequirementScope = "ORIGINAL" | "ADDITIONAL" | "PENDING";

export type RequirementInclusion = {
  documentType: "proposal" | "quotation";
  kind: DocumentKind;
  version: number;
  status: DocumentStatus;
};

export type RequirementScopeInfo = {
  scope: RequirementScope;
  includedIn: RequirementInclusion[];
};

type SnapshotItem = { id?: unknown };

function extractSnapshotIds(snapshot: unknown): string[] {
  if (!Array.isArray(snapshot)) return [];
  return (snapshot as SnapshotItem[])
    .map((item) => (item && typeof item === "object" && "id" in item ? String(item.id) : null))
    .filter((id): id is string => id !== null);
}

async function loadVersionsWithSnapshots(projectId: string) {
  const [proposalVersions, quotationVersions] = await Promise.all([
    db.proposalVersion.findMany({
      where: { proposal: { projectId } },
      select: {
        version: true,
        proposal: { select: { kind: true, status: true } },
        requirementVersion: { select: { snapshot: true } },
      },
    }),
    db.quotationVersion.findMany({
      where: { quotation: { projectId } },
      select: {
        version: true,
        quotation: { select: { kind: true, status: true } },
        requirementVersion: { select: { snapshot: true } },
      },
    }),
  ]);
  return { proposalVersions, quotationVersions };
}

// Per-requirement scope + "which document versions included this" — used on
// the Requirements page.
export async function computeRequirementScopeMap(
  projectId: string
): Promise<Map<string, RequirementScopeInfo>> {
  const { proposalVersions, quotationVersions } = await loadVersionsWithSnapshots(projectId);
  const map = new Map<string, RequirementScopeInfo>();

  function record(ids: string[], inclusion: RequirementInclusion) {
    for (const id of ids) {
      const entry = map.get(id) ?? { scope: "PENDING", includedIn: [] };
      entry.includedIn.push(inclusion);
      map.set(id, entry);
    }
  }

  for (const pv of proposalVersions) {
    record(extractSnapshotIds(pv.requirementVersion.snapshot), {
      documentType: "proposal",
      kind: pv.proposal.kind,
      version: pv.version,
      status: pv.proposal.status,
    });
  }
  for (const qv of quotationVersions) {
    record(extractSnapshotIds(qv.requirementVersion.snapshot), {
      documentType: "quotation",
      kind: qv.quotation.kind,
      version: qv.version,
      status: qv.quotation.status,
    });
    // Scope classification is quotation-acceptance-driven only (a sent-but-
    // not-yet-accepted quotation doesn't lock anything in).
    if (qv.quotation.status === "ACCEPTED") {
      const scope: RequirementScope = qv.quotation.kind === "ORIGINAL" ? "ORIGINAL" : "ADDITIONAL";
      for (const id of extractSnapshotIds(qv.requirementVersion.snapshot)) {
        const entry = map.get(id);
        // ORIGINAL always wins over ADDITIONAL if a requirement somehow
        // shows up in both (shouldn't happen given the delta computation
        // below, but keep the more foundational label if it does).
        if (entry && (entry.scope === "PENDING" || (entry.scope === "ADDITIONAL" && scope === "ORIGINAL"))) {
          entry.scope = scope;
        }
      }
    }
  }

  return map;
}

// The set of every requirement id that has ever appeared in any
// Proposal/Quotation snapshot for this project — "already spoken for",
// regardless of that document's current status.
export async function getCoveredRequirementIds(projectId: string): Promise<Set<string>> {
  const { proposalVersions, quotationVersions } = await loadVersionsWithSnapshots(projectId);
  const ids = new Set<string>();
  for (const pv of proposalVersions) {
    for (const id of extractSnapshotIds(pv.requirementVersion.snapshot)) ids.add(id);
  }
  for (const qv of quotationVersions) {
    for (const id of extractSnapshotIds(qv.requirementVersion.snapshot)) ids.add(id);
  }
  return ids;
}

// Narrower than getCoveredRequirementIds — only ids that have appeared in a
// PROPOSAL version, regardless of that proposal's (or its share's) status.
// Editing a requirement's text once it's here is a no-op that can never
// reach the client: the proposal already generated from it is a frozen
// snapshot, and nothing re-pulls a plain text edit into a new one short of
// locking a new scope version and running Revise-with-AI (or regenerating,
// for a still-fully-editable draft). Blocking the edit up front is clearer
// than letting it silently go nowhere.
export async function getRequirementIdsCoveredByAnyProposal(projectId: string): Promise<Set<string>> {
  const { proposalVersions } = await loadVersionsWithSnapshots(projectId);
  const ids = new Set<string>();
  for (const pv of proposalVersions) {
    for (const id of extractSnapshotIds(pv.requirementVersion.snapshot)) ids.add(id);
  }
  return ids;
}

// Superset of getCoveredRequirementIds — every requirement id that has ever
// been locked into ANY RequirementVersion for this project, whether or not a
// proposal/quotation has actually been generated from it yet. "Lock approved
// scope" is itself the commitment checkpoint (it's what the *next* generate
// action will read), so a requirement already locked shouldn't be silently
// deletable — deleting it wouldn't touch the frozen snapshot, but it would
// mean a future document could still include something the live list no
// longer shows any record of.
export async function getLockedRequirementIds(projectId: string): Promise<Set<string>> {
  const versions = await db.requirementVersion.findMany({
    where: { projectId },
    select: { snapshot: true },
  });
  const ids = new Set<string>();
  for (const v of versions) {
    for (const id of extractSnapshotIds(v.snapshot)) ids.add(id);
  }
  return ids;
}

// Is this project past commercial acceptance, and if so, what approved
// requirements haven't been included in any document yet? Shared by the
// "Generate Additional Proposal" action and the UI that decides whether to
// show it / show a "Needs Review" notice.
export async function computeAdditionalScopeDelta(projectId: string): Promise<{
  eligible: boolean;
  deltaRequirements: { id: string; category: string; requirement: string; status: string; priority: string; confidence: string; evidence: string | null; notes: string | null }[];
}> {
  const acceptedOriginalQuotation = await db.quotation.findFirst({
    where: { projectId, kind: "ORIGINAL", status: "ACCEPTED" },
    select: { id: true },
  });
  if (!acceptedOriginalQuotation) {
    return { eligible: false, deltaRequirements: [] };
  }

  const [covered, approvedRequirements] = await Promise.all([
    getCoveredRequirementIds(projectId),
    db.requirement.findMany({ where: { projectId, status: "APPROVED" }, orderBy: { createdAt: "asc" } }),
  ]);

  const deltaRequirements = approvedRequirements
    .filter((r) => !covered.has(r.id))
    .map((r) => ({
      id: r.id,
      category: r.category,
      requirement: r.requirement,
      status: r.status,
      priority: r.priority,
      confidence: r.confidence,
      evidence: r.evidence,
      notes: r.notes,
    }));

  return { eligible: true, deltaRequirements };
}
