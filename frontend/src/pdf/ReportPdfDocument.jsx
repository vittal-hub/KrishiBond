import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { PdfHeader, PdfFooter, Table, styles, COLORS } from './PdfBrand.jsx';

const kpiStyles = {
  row: { flexDirection: 'row', marginBottom: 18, gap: 16, flexWrap: 'wrap' },
  box: { flexGrow: 1, minWidth: 100, borderLeft: `2px solid ${COLORS.canopy600}`, paddingLeft: 8 },
  label: { fontSize: 8, color: COLORS.inkFaint, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 2 },
};

function ReportPdfDocument({ title, kpis = [], columns, rows }) {
  return (
    <Document title={`KrishiBond Report - ${title || ''}`}>
      <Page size="A4" style={styles.page}>
        <PdfHeader docLabel="Report" />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{rows.length} record{rows.length === 1 ? '' : 's'}</Text>
        </View>

        {kpis.length > 0 && (
          <View style={kpiStyles.row} wrap={false}>
            {kpis.map((k) => (
              <View key={k.label} style={kpiStyles.box}>
                <Text style={kpiStyles.label}>{k.label}</Text>
                <Text style={kpiStyles.value}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}

        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} />
        ) : (
          <Text style={{ color: COLORS.inkFaint, fontSize: 9 }}>No records for this period.</Text>
        )}

        <PdfFooter />
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
