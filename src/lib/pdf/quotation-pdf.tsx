import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";
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
  muted: { color: "#666", fontSize: 9 },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colDiscount: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  tableHeaderText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#555" },
  tableCellText: { fontSize: 9.5 },
  totalsBlock: { marginTop: 10, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totalsLabel: { fontSize: 9.5, color: "#555" },
  totalsValue: { fontSize: 9.5 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  grandTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#ddd" },
  footerHeading: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  footerText: { fontSize: 8, color: "#666", lineHeight: 1.4 },
});

export function QuotationPdfDocument({
  quotationNumber,
  clientName,
  company,
  email,
  phone,
  preparedBy,
  generatedAt,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  taxRate,
  taxAmount,
  total,
  paymentTerms,
  currency,
  branding,
  accentColor = DEFAULT_ACCENT_COLOR,
  termsAndConditions,
}: {
  quotationNumber: string;
  clientName: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  preparedBy: string;
  generatedAt: string;
  items: {
    description: string;
    quantity: string;
    unitPrice: string;
    discountPercent: string;
    lineTotal: string;
  }[];
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  paymentTerms?: string | null;
  currency: string;
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
  const brandContactLine = [branding?.companyEmail, branding?.companyPhone, branding?.companyWebsite]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Document title={quotationNumber}>
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
        <Text style={styles.coverTitle}>Quotation {quotationNumber}</Text>
        <Text style={styles.coverSubtitle}>
          Prepared for: {clientName}
          {company ? ` (${company})` : ""}
        </Text>
        {email && <Text style={styles.coverSubtitle}>Email: {email}</Text>}
        {phone && <Text style={styles.coverSubtitle}>Phone: {phone}</Text>}
        <Text style={styles.coverSubtitle}>Prepared by: {preparedBy}</Text>
        <Text style={styles.coverSubtitle}>Date: {generatedAt}</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Line Items</Text>
          {items.length === 0 ? (
            <Text style={styles.muted}>None specified.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
                <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit price</Text>
                <Text style={[styles.tableHeaderText, styles.colDiscount]}>Disc.</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
              </View>
              {items.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, styles.colDescription]}>{item.description}</Text>
                  <Text style={[styles.tableCellText, styles.colQty]}>{item.quantity}</Text>
                  <Text style={[styles.tableCellText, styles.colPrice]}>
                    {formatCurrency(item.unitPrice, currency)}
                  </Text>
                  <Text style={[styles.tableCellText, styles.colDiscount]}>
                    {Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : "—"}
                  </Text>
                  <Text style={[styles.tableCellText, styles.colTotal]}>
                    {formatCurrency(item.lineTotal, currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount ({discountPercent}%)</Text>
              <Text style={styles.totalsValue}>-{formatCurrency(discountAmount, currency)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(taxAmount, currency)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total, currency)}</Text>
            </View>
          </View>
        </View>

        {paymentTerms && (
          <View style={styles.section}>
            <Text style={styles.heading}>Payment Terms</Text>
            <Text style={styles.paragraph}>{paymentTerms}</Text>
          </View>
        )}

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
