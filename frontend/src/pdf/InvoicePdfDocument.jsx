import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '../utils/format';
import { PdfHeader, PdfFooter, Section, FieldRow, styles } from './PdfBrand.jsx';

const TYPE_LABELS = {
  escrow_fund: 'Escrow Funding',
  escrow_release: 'Escrow Release',
  refund: 'Refund',
  platform_fee: 'Platform Fee',
};

function InvoicePdfDocument({ transaction }) {
  return (
    <Document title={`KrishiBond Invoice ${transaction._id || ''}`}>
      <Page size="A4" style={styles.page}>
        <PdfHeader docLabel="Invoice" />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Invoice</Text>
          <Text style={styles.subtitle}>
            Transaction #{transaction._id?.slice(-8)} · {formatDate(transaction.createdAt)}
          </Text>
        </View>

        <Section title="Transaction Details">
          <FieldRow label="Type" value={TYPE_LABELS[transaction.type] || transaction.type} />
          <FieldRow label="Status" value={transaction.status} />
          <FieldRow label="Gateway" value={transaction.gateway} />
          {transaction.contract?.cropType && (
            <FieldRow
              label="Contract"
              value={`${transaction.contract.cropType} — ${transaction.contract.quantity} ${transaction.contract.unit}`}
            />
          )}
        </Section>

        <Section title="Amount">
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{formatCurrency(transaction.amount)}</Text>
          </View>
        </Section>

        <PdfFooter />
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
