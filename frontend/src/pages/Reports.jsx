import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import { contractApi } from "../api/contractApi";
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

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    contractApi
      .summaryReport()
      .then(setSummary)
      .catch((error) =>
        toast.error(getErrorMessage(error, "Could not load reports")),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await contractApi.exportReport();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "kissanbazaar-report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Loader full label="Building your report" />;

  const byStatus = summary?.byStatus ?? [];
  const byMonth = summary?.byMonth ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Reports</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary"
        >
          <Download className="w-4 h-4" />{" "}
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stub-card p-5">
          <p className="text-xs text-ink-faint">Total contracts</p>
          <p className="font-display text-2xl font-semibold mt-1">
            {summary?.totalContracts ?? 0}
          </p>
        </div>
        <div className="stub-card p-5">
          <p className="text-xs text-ink-faint">Total value</p>
          <p className="font-display text-2xl font-semibold mt-1">
            {formatCurrency(summary?.totalValue)}
          </p>
        </div>
        <div className="stub-card p-5">
          <p className="text-xs text-ink-faint">Fulfilled on time</p>
          <p className="font-display text-2xl font-semibold mt-1">
            {summary?.onTimeRate ?? 0}%
          </p>
        </div>
        <div className="stub-card p-5">
          <p className="text-xs text-ink-faint">Disputes filed</p>
          <p className="font-display text-2xl font-semibold mt-1">
            {summary?.disputeCount ?? 0}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">
            Contract value by month
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byMonth}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(28,43,34,0.08)"
              />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#7C8577" />
              <YAxis tick={{ fontSize: 12 }} stroke="#7C8577" />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#2F5233" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">
            Contracts by status
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
              >
                {byStatus.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "#7C8577"}
                  />
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
