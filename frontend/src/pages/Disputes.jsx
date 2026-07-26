import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ShieldAlert, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { disputeApi } from "../api/communicationApi";
import Loader from "../components/Loader.jsx";
import { formatRelative } from "../utils/format";
import { getErrorMessage } from "../utils/errorMessage";

function NewDisputeForm({ defaultContractId, onCreated, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { contractId: defaultContractId ?? "" },
  });

  const onSubmit = async (values) => {
    try {
      const dispute = await disputeApi.file(values);
      toast.success("Dispute filed — our team will review it shortly");
      onCreated(dispute);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not file the dispute"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="stub-card p-6 space-y-4">
      <div>
        <label className="label" htmlFor="contractId">
          Contract ID
        </label>
        <input
          id="contractId"
          className="input-field"
          placeholder="Contract this dispute relates to"
          {...register("contractId", { required: "Contract ID is required" })}
        />
        {errors.contractId && (
          <p className="text-xs text-clay-500 mt-1">
            {errors.contractId.message}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="reason">
          What went wrong?
        </label>
        <textarea
          id="reason"
          rows={4}
          className="input-field resize-none"
          placeholder="Describe the issue with dates, quantities, or quality concerns"
          {...register("reason", { required: "Please describe the issue" })}
        />
        {errors.reason && (
          <p className="text-xs text-clay-500 mt-1">{errors.reason.message}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-danger">
          {isSubmitting ? "Filing…" : "File dispute"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Disputes() {
  const [searchParams] = useSearchParams();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(
    searchParams.get("contractId") != null || searchParams.get("new") != null,
  );

  useEffect(() => {
    disputeApi
      .list()
      .then((data) => setDisputes(data.items ?? data))
      .catch((error) =>
        toast.error(getErrorMessage(error, "Could not load disputes")),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Disputes</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> File a dispute
          </button>
        )}
      </div>

      {showForm && (
        <NewDisputeForm
          defaultContractId={searchParams.get("contractId")}
          onCreated={(d) => {
            setDisputes((prev) => [d, ...prev]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <Loader label="Loading disputes" />
      ) : disputes.length === 0 ? (
        <div className="stub-card p-10 text-center text-sm text-ink-faint">
          No disputes filed. Most contracts on KrishiBond resolve without one.
        </div>
      ) : (
        <div className="stub-card divide-y divide-ink/5">
          {disputes.map((d) => (
            <Link
              key={d._id}
              to={`/disputes/${d._id}`}
              className="flex items-center justify-between gap-3 p-5 hover:bg-clay-50/40 transition"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4.5 h-4.5 text-clay-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{d.reason}</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    Contract #{d.contractId?.slice?.(-6)} ·{" "}
                    {formatRelative(d.createdAt)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full bg-clay-50 text-clay-600 border border-clay-400/30">
                {d.status ?? "open"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
