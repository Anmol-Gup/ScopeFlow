import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { ProposalContent } from "@/lib/ai/schemas";
import { DEFAULT_ACCENT_COLOR } from "@/lib/branding";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 2,
  },
  logo: { width: 48, height: 48, objectFit: "contain" },
  brandCompanyName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  brandContactLine: { fontSize: 8, color: "#666" },
  coverTitle: { fontSize: 22, marginBottom: 8 },
  coverSubtitle: { fontSize: 12, color: "#555", marginBottom: 4 },
  section: { marginTop: 18 },
  heading: { fontSize: 14, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  paragraph: { marginBottom: 4, lineHeight: 1.4 },
  listItem: { marginBottom: 3, lineHeight: 1.4 },
  requirementItem: { marginBottom: 3, lineHeight: 1.4 },
  muted: { color: "#666", fontSize: 9 },
  draftBadge: {
    fontSize: 9,
    color: "#b45309",
    marginBottom: 12,
  },
  footer: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#ddd" },
  footerHeading: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  footerText: { fontSize: 8, color: "#666", lineHeight: 1.4 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <Text style={styles.muted}>None specified.</Text>;
  return (
    <>
      {items.map((item, i) => (
        <Text key={i} style={styles.listItem}>
          • {item}
        </Text>
      ))}
    </>
  );
}

export function ProposalPdfDocument({
  content,
  clientName,
  company,
  email,
  phone,
  preparedBy,
  generatedAt,
  requirements,
  branding,
  accentColor = DEFAULT_ACCENT_COLOR,
  termsAndConditions,
}: {
  content: ProposalContent;
  clientName: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  preparedBy: string;
  generatedAt: string;
  requirements: { category: string; requirement: string; confidence: string }[];
  branding?: {
    logoDataUri: string | null;
    companyName: string | null;
    companyEmail: string | null;
    companyPhone: string | null;
    companyWebsite: string | null;
    address: string | null;
    taxId: string | null;
  } | null;
  accentColor?: string;
  termsAndConditions?: string | null;
}) {
  const grouped = ["FUNCTIONAL", "NON_FUNCTIONAL", "INTEGRATION", "CONSTRAINT"].map((category) => ({
    category,
    items: requirements.filter((r) => r.category === category),
  }));
  const brandContactLine = [branding?.companyEmail, branding?.companyPhone, branding?.companyWebsite]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Document title={content.coverTitle}>
      <Page size="A4" style={styles.page}>
        {branding && (branding.logoDataUri || branding.companyName) && (
          <View style={[styles.brandHeader, { borderBottomColor: accentColor }]}>
            {/* react-pdf's Image is a PDF-drawing primitive, not a DOM <img> — it has no alt prop. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {branding.logoDataUri && <Image src={branding.logoDataUri} style={styles.logo} />}
            <View>
              <Text style={styles.brandCompanyName}>{branding.companyName || preparedBy}</Text>
              {brandContactLine && <Text style={styles.brandContactLine}>{brandContactLine}</Text>}
              {branding.address && <Text style={styles.brandContactLine}>{branding.address}</Text>}
            </View>
          </View>
        )}
        <Text style={styles.draftBadge}>DRAFT — AI-generated, pending internal review</Text>
        <Text style={styles.coverTitle}>{content.coverTitle}</Text>
        <Text style={styles.coverSubtitle}>Prepared for: {clientName}{company ? ` (${company})` : ""}</Text>
        {email && <Text style={styles.coverSubtitle}>Email: {email}</Text>}
        {phone && <Text style={styles.coverSubtitle}>Phone: {phone}</Text>}
        <Text style={styles.coverSubtitle}>Prepared by: {preparedBy}</Text>
        <Text style={styles.coverSubtitle}>Date: {generatedAt}</Text>

        <Section title="Executive Summary">
          <Text style={styles.paragraph}>{content.executiveSummary}</Text>
        </Section>

        <Section title="Business Understanding">
          <Text style={styles.paragraph}>{content.businessUnderstanding}</Text>
        </Section>

        <Section title="Proposed Solution">
          <Text style={styles.paragraph}>{content.proposedSolution}</Text>
        </Section>

        <Section title="Scope of Work">
          <BulletList items={content.scopeOfWork} />
        </Section>

        <Section title="Functional Requirements">
          {grouped.map(
            (group) =>
              group.items.length > 0 && (
                <View key={group.category} style={{ marginBottom: 6 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2 }}>
                    {group.category.replace("_", "-")}
                  </Text>
                  {group.items.map((item, i) => (
                    <Text key={i} style={styles.requirementItem}>
                      • {item.requirement} ({item.confidence.toLowerCase()} confidence)
                    </Text>
                  ))}
                </View>
              )
          )}
        </Section>

        <Section title="Deliverables">
          <BulletList items={content.deliverables} />
        </Section>

        <Section title="Technology Stack">
          <BulletList items={content.technologyStack} />
        </Section>

        <Section title="Timeline">
          <Text style={styles.paragraph}>{content.timeline}</Text>
        </Section>

        <Section title="Assumptions">
          <BulletList items={content.assumptions} />
        </Section>

        <Section title="Out of Scope">
          <BulletList items={content.outOfScope} />
        </Section>

        <Section title="Support & Warranty">
          <Text style={styles.paragraph}>{content.supportWarranty}</Text>
        </Section>

        <Section title="Payment Terms">
          <Text style={styles.paragraph}>{content.paymentTerms}</Text>
        </Section>

        <Section title="Next Steps">
          <BulletList items={content.nextSteps} />
        </Section>

        {(termsAndConditions || branding?.taxId) && (
          <View style={styles.footer}>
            {branding?.taxId && <Text style={styles.footerText}>GST/Tax registration: {branding.taxId}</Text>}
            {termsAndConditions && (
              <>
                <Text style={[styles.footerHeading, { marginTop: 6 }]}>Terms &amp; Conditions</Text>
                <Text style={styles.footerText}>{termsAndConditions}</Text>
              </>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
