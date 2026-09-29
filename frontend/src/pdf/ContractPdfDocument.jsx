import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '../utils/format';
import { PdfHeader, PdfFooter, Section, FieldRow, styles, COLORS } from './PdfBrand.jsx';

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

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            <Text>{contract.signatures?.farmer?.signatureName || contract.farmerName}</Text>
            <Text style={{ color: COLORS.inkFaint, fontSize: 8, marginTop: 2 }}>
              Farmer signature {contract.signatures?.farmer ? `· ${formatDate(contract.signatures.farmer.signedAt)}` : '(not signed)'}
            </Text>
          </View>
          <View style={styles.signBox}>
            <Text>{contract.signatures?.buyer?.signatureName || contract.buyerName}</Text>
            <Text style={{ color: COLORS.inkFaint, fontSize: 8, marginTop: 2 }}>
              Buyer signature {contract.signatures?.buyer ? `· ${formatDate(contract.signatures.buyer.signedAt)}` : '(not signed)'}
            </Text>
          </View>
        </View>

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
