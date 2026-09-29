import React from 'react';
import { Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { formatDate } from '../utils/format';

// Same palette as tailwind.config.js so every generated document matches the
// app's actual visual identity instead of inventing a separate PDF theme.
export const COLORS = {
  paper: '#F7F5EF',
  paperCard: '#FFFEFB',
  ink: '#1C2B22',
  inkSoft: '#3E4A40',
  inkFaint: '#7C8577',
  canopy50: '#EAF0EA',
  canopy300: '#7FA07F',
  canopy600: '#2F5233',
  canopy700: '#25401E',
  harvest500: '#C98A2C',
  clay500: '#B4502A',
  divider: '#E2E8E5',
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.ink,
  },
  // Fixed brand header repeated on every page.
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 14,
    borderBottom: `1.5px solid ${COLORS.canopy600}`,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.canopy600,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandName: { fontSize: 15, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, color: COLORS.ink },
  brandTagline: { fontSize: 7, color: COLORS.inkFaint, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },
  headerDocMeta: { alignItems: 'flex-end' },
  headerDocLabel: { fontSize: 8, color: COLORS.inkFaint, textTransform: 'uppercase', letterSpacing: 1 },
  headerDocDate: { fontSize: 8, color: COLORS.inkFaint, marginTop: 2 },
  // Fixed footer repeated on every page.
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 20,
    borderTop: `0.5px solid ${COLORS.divider}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: COLORS.inkFaint },
  // Document title block.
  titleBlock: { marginBottom: 18 },
  title: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: COLORS.ink, marginBottom: 3 },
  subtitle: { fontSize: 9, color: COLORS.inkFaint },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 7.5,
    color: COLORS.canopy700,
    backgroundColor: COLORS.canopy50,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  // Sections.
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottom: `1px solid ${COLORS.divider}`,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'flex-start' },
  label: { color: COLORS.inkFaint, width: '45%' },
  value: { fontFamily: 'Helvetica-Bold', width: '55%', textAlign: 'right' },
  // Tables.
  table: { width: '100%' },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.canopy50,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5px solid ${COLORS.divider}`,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: { backgroundColor: '#FBFAF6' },
  cellHeader: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: 0.3 },
  cell: { fontSize: 8.5, color: COLORS.ink },
  // Key figure callout (amounts, totals).
  amountBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 4,
    backgroundColor: COLORS.canopy50,
  },
  amountLabel: { fontSize: 8, color: COLORS.canopy700, textTransform: 'uppercase', letterSpacing: 0.8 },
  amountValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.canopy700, marginTop: 3 },
  amountNote: { fontSize: 8, color: COLORS.inkFaint, marginTop: 4 },
  disclaimer: { marginTop: 20, fontSize: 7.5, color: COLORS.inkFaint, borderTop: `0.5px solid ${COLORS.divider}`, paddingTop: 8 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  signBox: { width: '45%', borderTop: `1px solid ${COLORS.ink}`, paddingTop: 5 },
});

// Redrawn from the app's own Sprout mark (lucide-react "Sprout" icon, used in
// the Navbar/Login/Register brand lockup) so the PDF logo matches the live
// product instead of introducing a new, unrelated mark.
function SproutMark({ size = 14, color = COLORS.paper }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 20h10" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M10 20c5.5-2.5.8-6.4 3-10" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path
        d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Fixed page header: brand lockup on the left, document type + generated
 * date on the right. `fixed` repeats it identically on every page.
 */
export function PdfHeader({ docLabel }) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <SproutMark />
          </View>
          <View>
            <Text style={styles.brandName}>KRISHIBOND</Text>
            <Text style={styles.brandTagline}>Contract Farming Platform</Text>
          </View>
        </View>
        <View style={styles.headerDocMeta}>
          <Text style={styles.headerDocLabel}>{docLabel}</Text>
          <Text style={styles.headerDocDate}>Generated {formatDate(new Date(), 'dd MMM yyyy, HH:mm')}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Fixed page footer: brand + "Page X of Y" via react-pdf's built-in
 * render-prop page counters (no extra library needed).
 */
export function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>KrishiBond | Contract Farming Platform</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

export function Section({ title, children }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function FieldRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? '—'}</Text>
    </View>
  );
}

/**
 * Simple column table for itemized data (report rows, breakdowns). Rows
 * alternate shading for readability and the header repeats on every page a
 * long table spills onto.
 */
export function Table({ columns, rows }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow} fixed>
        {columns.map((c) => (
          <Text key={c.key} style={[styles.cellHeader, { width: c.width || `${100 / columns.length}%` }]}>
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]} wrap={false}>
          {columns.map((c) => (
            <Text key={c.key} style={[styles.cell, { width: c.width || `${100 / columns.length}%` }]}>
              {row[c.key] ?? ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
