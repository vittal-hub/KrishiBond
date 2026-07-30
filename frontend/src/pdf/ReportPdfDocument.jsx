import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { formatDate } from '../utils/format';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1C2B22' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#7C8577', marginBottom: 18 },
  kpiRow: { flexDirection: 'row', marginBottom: 18, gap: 16 },
  kpiBox: { flexGrow: 1, borderLeft: '2px solid #2F5233', paddingLeft: 8 },
  kpiLabel: { fontSize: 8, color: '#7C8577' },
  kpiValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  table: { width: '100%' },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1px solid #1C2B22', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #E2E8E5', paddingVertical: 3 },
  cellHeader: { fontWeight: 700, fontSize: 8 },
  cell: { fontSize: 8 },
});

function ReportPdfDocument({ title, kpis = [], columns, rows }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>KrishiBond · Generated {formatDate(new Date())}</Text>

        {kpis.length > 0 && (
          <View style={styles.kpiRow}>
            {kpis.map((k) => (
              <View key={k.label} style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {columns.map((c) => (
              <Text key={c.key} style={[styles.cellHeader, { width: `${100 / columns.length}%` }]}>
                {c.header}
              </Text>
            ))}
          </View>
          {rows.map((row, idx) => (
            <View key={idx} style={styles.tableRow}>
              {columns.map((c) => (
                <Text key={c.key} style={[styles.cell, { width: `${100 / columns.length}%` }]}>
                  {row[c.key] ?? ''}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function downloadReportPdf({ title, kpis, columns, rows, filename }) {
  const blob = await pdf(<ReportPdfDocument title={title} kpis={kpis} columns={columns} rows={rows} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default ReportPdfDocument;
