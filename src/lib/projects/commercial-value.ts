import { db } from "@/lib/db";

// The project's total commercial value is never stored — it's the sum of
// every ACCEPTED quotation's current version total (Original + all
// Additional), computed on read so it can never drift out of sync with the
// documents it's derived from.
export async function computeProjectCommercialValue(projectId: string): Promise<number> {
  const quotations = await db.quotation.findMany({
    where: { projectId, status: "ACCEPTED" },
    select: {
      currentVersion: true,
      versions: { select: { version: true, total: true } },
    },
  });

  let total = 0;
  for (const quotation of quotations) {
    const current = quotation.versions.find((v) => v.version === quotation.currentVersion);
    if (current) total += Number(current.total);
  }
  return total;
}
