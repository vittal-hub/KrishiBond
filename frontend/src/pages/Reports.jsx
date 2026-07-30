import React, { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import toast from "react-hot-toast";
import { reportApi } from "../api/reportApi";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "../components/Loader.jsx";
import { formatCurrency } from "../utils/format";
import { getErrorMessage } from "../utils/errorMessage";

const STATUS_COLORS = {
  pending: "#C98A2C",
  active: "#2F5233",
  fulfilled: "#3A6B7A",
  disputed: "#B4502A",
  cancelled: "#7C8577",
};

const REPORT_TYPES = [
  { value: "contracts", label: "Contracts" },
  { value: "income", label: "Income" },
  { value: "crops", label: "Crops" },
];

function KpiCard({ label, value }) {
  return (
    <div className="stub-card p-5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="font-display text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export default function Reports() {
  const { role } = useAuth();
  const [reportType, setReportType] = useState("contracts");
  const [range, setRange] = useState({ from: "", to: "" });
  const [scope, setScope] = useState("mine");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  const params = { ...(range.from && { from: range.from }), ...(range.to && { to: range.to }), ...(scope === "platform" && { scope }) };

  useEffect(() => {
    setLoading(true);
    const fetcher = reportType === "income" ? reportApi.income : reportType === "crops" ? reportApi.crops : reportApi.summary;
    fetcher(params)
      .then(setData)
      .catch((error) => toast.error(getErrorMessage(error, "Could not load this report")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, range.from, range.to, scope]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const blob = await reportApi.export({ type: reportType, format, ...params });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `krishibond-${reportType}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed"));
    } finally {
      setExporting(null);
    }
  };

  const handlePdfExport = async () => {
    setExporting("pdf");
    try {
      const { downloadReportPdf } = await import("../pdf/ReportPdfDocument.jsx");
      if (reportType === "contracts") {
        await downloadReportPdf({
          title: "Contracts Report",
          kpis: [
            { label: "Total contracts", value: data.totalContracts },
            { label: "Total value", value: formatCurrency(data.totalValue) },
            { label: "Fulfilled on time", value: `${data.onTimeRate}%` },
            { label: "Disputes", value: data.disputeCount },
          ],
          columns: [
            { key: "status", header: "Status" },
            { key: "count", header: "Count" },
          ],
          rows: data.byStatus,
          filename: "krishibond-contracts",
        });
      } else if (reportType === "income") {
        await downloadReportPdf({
          title: "Income Report",
          kpis: [
            { label: "Total earned", value: formatCurrency(data.totalEarned) },
            { label: "Total spent", value: formatCurrency(data.totalSpent) },
            { label: "Total refunded", value: formatCurrency(data.totalRefunded) },
          ],
          columns: [
            { key: "month", header: "Month" },
            { key: "earned", header: "Earned" },
            { key: "spent", header: "Spent" },
            { key: "refunded", header: "Refunded" },
          ],
          rows: data.trend.map((t) => ({ ...t, earned: formatCurrency(t.earned), spent: formatCurrency(t.spent), refunded: formatCurrency(t.refunded) })),
          filename: "krishibond-income",
        });
      } else {
        await downloadReportPdf({
          title: "Crops Report",
          columns: [
            { key: "cropType", header: "Crop" },
            { key: "count", header: "Contracts" },
            { key: "totalQuantity", header: "Total Quantity" },
            { key: "totalValue", header: "Total Value" },
          ],
          rows: data.crops.map((c) => ({ ...c, totalValue: formatCurrency(c.totalValue) })),
          filename: "krishibond-crops",
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "PDF export failed"));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Reports</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport("csv")} disabled={!!exporting} className="btn-secondary text-xs px-3 py-1.5">
            <Download className="w-3.5 h-3.5" /> {exporting === "csv" ? "Exporting…" : "CSV"}
          </button>
          <button onClick={() => handleExport("xlsx")} disabled={!!exporting} className="btn-secondary text-xs px-3 py-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> {exporting === "xlsx" ? "Exporting…" : "Excel"}
          </button>
          <button onClick={handlePdfExport} disabled={!!exporting || loading} className="btn-secondary text-xs px-3 py-1.5">
            <FileText className="w-3.5 h-3.5" /> {exporting === "pdf" ? "Exporting…" : "PDF"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className="input-field max-w-[160px]" value={reportType} onChange={(e) => setReportType(e.target.value)}>
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input type="date" className="input-field max-w-[160px]" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <span className="text-xs text-ink-faint">to</span>
        <input type="date" className="input-field max-w-[160px]" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        {role === "admin" && (
          <select className="input-field max-w-[160px]" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="mine">My data</option>
            <option value="platform">Platform-wide</option>
          </select>
        )}
      </div>

      {loading ? (
        <Loader full label="Building your report" />
      ) : reportType === "contracts" ? (
        <ContractsReport data={data} />
      ) : reportType === "income" ? (
        <IncomeReport data={data} />
      ) : (
        <CropsReport data={data} />
      )}
    </div>
  );
}

function ContractsReport({ data }) {
  const byStatus = data?.byStatus ?? [];
  const byMonth = data?.byMonth ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total contracts" value={data?.totalContracts ?? 0} />
        <KpiCard label="Total value" value={formatCurrency(data?.totalValue)} />
        <KpiCard label="Fulfilled on time" value={`${data?.onTimeRate ?? 0}%`} />
        <KpiCard label="Disputes filed" value={data?.disputeCount ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Contract value by month</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,34,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#7C8577" />
              <YAxis tick={{ fontSize: 12 }} stroke="#7C8577" />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#2F5233" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Contracts by status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byStatus} dataKey="count" nameKey="status" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {byStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#7C8577"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function IncomeReport({ data }) {
  const trend = data?.trend ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total earned" value={formatCurrency(data?.totalEarned)} />
        <KpiCard label="Total spent" value={formatCurrency(data?.totalSpent)} />
        <KpiCard label="Total refunded" value={formatCurrency(data?.totalRefunded)} />
      </div>

      <div className="stub-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Earned vs. spent by month</h2>
        {trend.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-ink-faint">No transactions in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,34,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#7C8577" />
              <YAxis tick={{ fontSize: 12 }} stroke="#7C8577" tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="earned" name="Earned" fill="#2F5233" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#B4502A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function CropsReport({ data }) {
  const crops = data?.crops ?? [];

  return (
    <div className="space-y-6">
      <div className="stub-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Value by crop</h2>
        {crops.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-ink-faint">No contracts in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={crops} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,34,0.08)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#7C8577" tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <YAxis type="category" dataKey="cropType" tick={{ fontSize: 12 }} stroke="#7C8577" width={100} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="totalValue" fill="#2F5233" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="stub-card divide-y divide-ink/5">
        {crops.map((c) => (
          <div key={c.cropType} className="flex items-center justify-between p-4">
            <p className="text-sm font-medium">{c.cropType}</p>
            <p className="text-xs text-ink-faint">{c.count} contract{c.count === 1 ? "" : "s"} · {c.totalQuantity} units · {formatCurrency(c.totalValue)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
