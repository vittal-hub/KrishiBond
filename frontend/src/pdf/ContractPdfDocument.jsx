import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '../utils/format';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: 'Helvetica', color: '#1C2B22' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#7C8577', marginBottom: 18 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, borderBottom: '1px solid #E2E8E5', paddingBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { color: '#7C8577' },
  value: { fontWeight: 700 },
  clause: { marginBottom: 3 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  signBox: { width: '45%', borderTop: '1px solid #1C2B22', paddingTop: 4 },
});

function ContractPdfDocument({ contract }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>KrishiBond Contract</Text>
        <Text style={styles.subtitle}>Contract #{contract.id?.slice(-6)} · Generated {formatDate(new Date())}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Farmer</Text>
            <Text style={styles.value}>{contract.farmerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Buyer</Text>
            <Text style={styles.value}>{contract.buyerName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Crop</Text>
            <Text style={styles.value}>{contract.cropType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{contract.quantity} {contract.unit}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Price per unit</Text>
            <Text style={styles.value}>{formatCurrency(contract.pricePerUnit)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total value</Text>
            <Text style={styles.value}>{formatCurrency(contract.totalValue)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Delivery date</Text>
            <Text style={styles.value}>{formatDate(contract.deliveryDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{contract.status}</Text>
          </View>
        </View>

        {contract.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{contract.terms}</Text>
          </View>
        )}

        {contract.customClauses?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom clauses</Text>
            {contract.customClauses.map((clause, idx) => (
              <Text key={idx} style={styles.clause}>{idx + 1}. {clause}</Text>
            ))}
          </View>
        )}

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <Text>{contract.signatures?.farmer?.signatureName || contract.farmerName}</Text>
            <Text style={styles.label}>
              Farmer signature {contract.signatures?.farmer ? `· ${formatDate(contract.signatures.farmer.signedAt)}` : '(not signed)'}
            </Text>
          </View>
          <View style={styles.signBox}>
            <Text>{contract.signatures?.buyer?.signatureName || contract.buyerName}</Text>
            <Text style={styles.label}>
              Buyer signature {contract.signatures?.buyer ? `· ${formatDate(contract.signatures.buyer.signedAt)}` : '(not signed)'}
            </Text>
          </View>
        </View>
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
