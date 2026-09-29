import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '../utils/format';
import { PdfHeader, PdfFooter, Section, FieldRow, styles } from './PdfBrand.jsx';

const TYPE_LABELS = {
  wallet_topup: 'Wallet Top-Up',
  escrow_fund: 'Escrow Funding',
  escrow_release: 'Escrow Release',
  refund: 'Refund',
  platform_fee: 'Platform Fee',
  withdrawal: 'Bank Withdrawal',
};

const METHOD_LABELS = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
};

function InvoicePdfDocument({ transaction, customer }) {
  const typeLabel = TYPE_LABELS[transaction.type] || transaction.type;
  const isTopup = transaction.type === 'wallet_topup';
  const docTitle = isTopup ? 'Wallet Top-Up Invoice' : 'Invoice';
  // Only real data ever appears here - meta fields are set server-side only
  // after a payment is verified (see walletController.completeTopupDemo /
  // verifyTopupRazorpay), never invented for display. Fields that don't
  // apply to a given transaction type (e.g. a payment method on an escrow
  // release) are omitted by FieldRow's own "—" fallback, not fabricated.
  const paymentId = transaction.meta?.gatewayPaymentId || transaction.gatewayRef;
  const paymentMethod = transaction.meta?.method ? (METHOD_LABELS[transaction.meta.method] || transaction.meta.method) : undefined;
  // Derived, not invented: a short, stable id built from the transaction's
  // own _id (same slicing convention already used for the filename/subtitle
  // below), used only when the gateway itself didn't issue a receipt number.
  const invoiceId = transaction.meta?.receiptNumber || `INV-${transaction._id?.slice(-8)?.toUpperCase() || 'UNKNOWN'}`;

  return (
    <Document title={`KrishiBond ${docTitle} ${transaction._id || ''}`}>
      <Page size="A4" style={styles.page}>
        <PdfHeader docLabel="Invoice" />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{docTitle}</Text>
          <Text style={styles.subtitle}>
            Invoice #{invoiceId} · {formatDate(transaction.createdAt, 'dd MMM yyyy, HH:mm')}
          </Text>
        </View>

        <Section title="Invoice Details">
          <FieldRow label="Invoice ID" value={invoiceId} />
          <FieldRow label="Transaction ID" value={transaction._id} />
          <FieldRow label="Payment ID" value={paymentId} />
        </Section>

        {customer && (customer.name || customer.email) && (
          <Section title="Customer">
            <FieldRow label="Name" value={customer.name} />
            <FieldRow label="Email" value={customer.email} />
          </Section>
        )}

        <Section title="Transaction Details">
          <FieldRow label="Type" value={typeLabel} />
          <FieldRow label="Payment Method" value={paymentMethod} />
          <FieldRow label="Transaction Date" value={formatDate(transaction.createdAt, 'dd MMM yyyy, HH:mm')} />
          <FieldRow label="Status" value={transaction.status} />
          {transaction.contract?.cropType && (
            <FieldRow
              label="Contract"
              value={`${transaction.contract.cropType} — ${transaction.contract.quantity} ${transaction.contract.unit}`}
            />
          )}
        </Section>

        <Section title="Amount">
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Total Paid</Text>
            <Text style={styles.amountValue}>{formatCurrency(transaction.amount)}</Text>
          </View>
        </Section>

        <PdfFooter />
      </Page>
    </Document>
  );
}

export async function downloadInvoicePdf(transaction, customer) {
  const blob = await pdf(<InvoicePdfDocument transaction={transaction} customer={customer} />).toBlob();
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
