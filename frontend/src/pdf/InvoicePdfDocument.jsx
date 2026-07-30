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
  amount: { fontSize: 22, fontWeight: 700, marginTop: 6 },
});

const TYPE_LABELS = {
  escrow_fund: 'Escrow Funding',
  escrow_release: 'Escrow Release',
  refund: 'Refund',
  platform_fee: 'Platform Fee',
};

function InvoicePdfDocument({ transaction }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>KrishiBond Invoice</Text>
        <Text style={styles.subtitle}>Transaction #{transaction._id?.slice(-8)} · {formatDate(transaction.createdAt)}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{TYPE_LABELS[transaction.type] || transaction.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{transaction.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gateway</Text>
            <Text style={styles.value}>{transaction.gateway}</Text>
          </View>
          {transaction.contract?.cropType && (
            <View style={styles.row}>
              <Text style={styles.label}>Contract</Text>
              <Text style={styles.value}>
                {transaction.contract.cropType} — {transaction.contract.quantity} {transaction.contract.unit}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amount}>{formatCurrency(transaction.amount)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadInvoicePdf(transaction) {
  const blob = await pdf(<InvoicePdfDocument transaction={transaction} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `krishibond-invoice-${transaction._id?.slice(-8) || 'txn'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default InvoicePdfDocument;
