import React from 'react';
import { Document, Page, Text, View, Image, pdf } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '../utils/format';
import { PdfHeader, PdfFooter, Section, FieldRow, styles, COLORS } from './PdfBrand.jsx';

// Signature block shared by both parties: an uploaded signature image when
// the signer has one on file (see Profile > My signature), otherwise the
// typed name they signed with - either way name/date always show underneath
// so the block reads correctly even for a not-yet-signed party.
function SignatureBlock({ role, signature, fallbackName }) {
  return (
    <View style={styles.signBox} wrap={false}>
      <Text style={{ fontSize: 8, color: COLORS.inkFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {role}
      </Text>
      <View style={{ height: 46, justifyContent: 'flex-end', marginBottom: 4 }}>
        {signature?.signatureUrl ? (
          // Only `width` is set (no height) so react-pdf scales the image
          // proportionally from its natural dimensions instead of stretching
          // it - this is what keeps the aspect ratio correct regardless of
          // how the source PNG/JPG was cropped.
          <Image src={signature.signatureUrl} style={{ width: 130, maxHeight: 46, objectFit: 'contain' }} />
        ) : (
          <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 15 }}>
            {signature?.signatureName || fallbackName || ''}
          </Text>
        )}
      </View>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>
        {signature?.signatureName || fallbackName}
      </Text>
      <Text style={{ color: COLORS.inkFaint, fontSize: 8, marginTop: 2 }}>
        {signature?.signedAt ? `Signed ${formatDate(signature.signedAt)}` : 'Not signed'}
      </Text>
    </View>
  );
}

function ContractPdfDocument({ contract }) {
  return (
    <Document title={`KrishiBond Contract ${contract.id || ''}`}>
      <Page size="A4" style={styles.page}>
        <PdfHeader docLabel="Contract Agreement" />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Contract Agreement</Text>
          <Text style={styles.subtitle}>
            Contract #{contract.id?.slice(-6)} · Status: {contract.status}
          </Text>
        </View>

        <Section title="Parties">
          <FieldRow label="Farmer" value={contract.farmerName} />
          <FieldRow label="Buyer" value={contract.buyerName} />
        </Section>

        <Section title="Contract Details">
          <FieldRow label="Crop" value={contract.cropType} />
          <FieldRow label="Quantity" value={`${contract.quantity} ${contract.unit}`} />
          <FieldRow label="Price per unit" value={formatCurrency(contract.pricePerUnit)} />
          <FieldRow label="Total value" value={formatCurrency(contract.totalValue)} />
          <FieldRow label="Delivery date" value={formatDate(contract.deliveryDate)} />
        </Section>

        {contract.village && (
          <Section title="Farming Location">
            <FieldRow label="Village" value={contract.village} />
          </Section>
        )}

        {contract.terms && (
          <Section title="Terms & Notes">
            <Text>{contract.terms}</Text>
          </Section>
        )}

        {contract.customClauses?.length > 0 && (
          <Section title="Custom Clauses">
            {contract.customClauses.map((clause, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 4 }} wrap>
                <Text style={{ width: 18, fontFamily: 'Helvetica-Bold' }}>{idx + 1}.</Text>
                <Text style={{ flex: 1 }}>{clause}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Status">
          <FieldRow label="Current status" value={contract.status} />
        </Section>

        <Section title="Signatures">
          <View style={styles.signRow}>
            <SignatureBlock role="Farmer" signature={contract.signatures?.farmer} fallbackName={contract.farmerName} />
            <SignatureBlock role="Buyer" signature={contract.signatures?.buyer} fallbackName={contract.buyerName} />
          </View>
        </Section>

        <PdfFooter />
      </Page>
    </Document>
  );
}

export async function downloadContractPdf(contract) {
  const blob = await pdf(<ContractPdfDocument contract={contract} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `krishibond-contract-${contract.id?.slice(-6) || 'draft'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default ContractPdfDocument;
