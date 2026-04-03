import React, { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DoctorContext } from "../../context/DoctorContext";

const METRIC_OPTIONS = [
  { key: "weight_kg", label: "Weight (kg)" },
  { key: "heart_rate", label: "Heart rate (bpm)" },
  { key: "glucose_mg_dl", label: "Glucose (mg/dL)" },
  { key: "bp_systolic", label: "Blood pressure — systolic (mmHg)" },
  { key: "bp_diastolic", label: "Blood pressure — diastolic (mmHg)" },
];

function formatDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const DoctorHealthChart = () => {
  const { dToken, backendUrl, appointments, getAppointments } =
    useContext(DoctorContext);
  const [searchParams] = useSearchParams();

  const [userId, setUserId] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [chartMetric, setChartMetric] = useState("weight_kg");
  const [formMetric, setFormMetric] = useState("weight_kg");
  const [formValue, setFormValue] = useState("");
  const [formWhen, setFormWhen] = useState(() =>
    formatDatetimeLocal(new Date())
  );
  const [formNote, setFormNote] = useState("");
  const [loading, setLoading] = useState(false);

  const patients = useMemo(() => {
    const m = new Map();
    appointments.forEach((a) => {
      if (a.userId && a.userData && !m.has(a.userId)) {
        m.set(a.userId, a.userData);
      }
    });
    return Array.from(m.entries()).map(([id, u]) => ({
      id,
      name: u.name,
      image: u.image,
    }));
  }, [appointments]);

  useEffect(() => {
    if (dToken) getAppointments();
  }, [dToken]);

  useEffect(() => {
    if (!patients.length) return;
    const q = searchParams.get("userId");
    if (q && patients.some((p) => p.id === q)) {
      setUserId(q);
      return;
    }
    setUserId((prev) =>
      prev && patients.some((p) => p.id === prev) ? prev : patients[0].id
    );
  }, [searchParams, patients]);

  const loadMetrics = async () => {
    if (!dToken || !userId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(
        backendUrl +
          "/api/doctor/patient-health-metrics?userId=" +
          encodeURIComponent(userId),
        { headers: { dToken } }
      );
      if (data.success) {
        setMetrics(data.metrics);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dToken && userId) loadMetrics();
  }, [dToken, userId, backendUrl]);

  const chartData = useMemo(() => {
    return metrics
      .filter((m) => m.metricKey === chartMetric)
      .map((m) => ({
        id: m._id,
        value: m.value,
        dateLabel: new Date(m.recordedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        recordedAt: m.recordedAt,
      }));
  }, [metrics, chartMetric]);

  const submitEntry = async (e) => {
    e.preventDefault();
    const num = Number(formValue);
    if (Number.isNaN(num) || num < 0) {
      toast.error("Enter a valid number");
      return;
    }
    const ts = new Date(formWhen).getTime();
    if (Number.isNaN(ts)) {
      toast.error("Invalid date");
      return;
    }
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/health-metrics",
        {
          userId,
          metricKey: formMetric,
          value: num,
          recordedAt: ts,
          note: formNote.trim(),
        },
        { headers: { dToken } }
      );
      if (data.success) {
        toast.success("Saved");
        setFormValue("");
        setFormNote("");
        setFormWhen(formatDatetimeLocal(new Date()));
        await loadMetrics();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    }
  };

  const removeEntry = async (id) => {
    try {
      const { data } = await axios.delete(
        backendUrl +
          "/api/doctor/health-metrics/" +
          id +
          "?userId=" +
          encodeURIComponent(userId),
        { headers: { dToken } }
      );
      if (data.success) {
        toast.success(data.message);
        await loadMetrics();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    }
  };

  const activePatient = patients.find((p) => p.id === userId);
  const metricLabel =
    METRIC_OPTIONS.find((o) => o.key === chartMetric)?.label ?? chartMetric;

  if (patients.length === 0) {
    return (
      <div className="m-5 max-w-xl">
        <p className="text-lg font-medium mb-2">Patient health</p>
        <p className="text-gray-500 text-sm">
          When patients book with you, you can log vitals and readings for them
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="m-5 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-1">
        Patient health chart
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Add readings for patients you have appointments with. They will see
        charts on their account (view only).
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-sm text-gray-600">Patient</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px] bg-white"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {activePatient && (
        <div className="flex items-center gap-3 mb-6">
          {activePatient.image && (
            <img
              src={activePatient.image}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <span className="font-medium text-gray-800">{activePatient.name}</span>
        </div>
      )}

      <form
        onSubmit={submitEntry}
        className="bg-white border rounded-lg p-5 mb-8 shadow-sm"
      >
        <p className="font-medium text-gray-700 mb-4">Add a reading</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Metric</label>
            <select
              value={formMetric}
              onChange={(e) => setFormMetric(e.target.value)}
              className="border rounded px-3 py-2 text-sm min-w-[200px] bg-white"
            >
              {METRIC_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Value</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Date & time
            </label>
            <input
              type="datetime-local"
              required
              value={formWhen}
              onChange={(e) => setFormWhen(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 block mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full"
              placeholder="e.g. clinic visit"
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-white px-6 py-2 rounded-full text-sm"
          >
            Save
          </button>
        </div>
      </form>

      <div className="bg-white border rounded-lg p-5 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="font-medium text-gray-700">Chart</p>
          <div>
            <label className="text-xs text-gray-500 mr-2">Show metric</label>
            <select
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white"
            >
              {METRIC_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-12 text-center">Loading…</p>
        ) : chartData.length === 0 ? (
          <p className="text-gray-400 text-sm py-12 text-center">
            No data for this metric yet.
          </p>
        ) : (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={metricLabel}
                  stroke="#5F6FFF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-5 shadow-sm">
        <p className="font-medium text-gray-700 mb-3">Entries</p>
        <div className="max-h-64 overflow-y-auto text-sm">
          {[...metrics]
            .sort((a, b) => b.recordedAt - a.recordedAt)
            .slice(0, 40)
            .map((m) => (
              <div
                key={m._id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-50"
              >
                <span className="text-gray-600">
                  {METRIC_OPTIONS.find((o) => o.key === m.metricKey)?.label ||
                    m.metricKey}
                  : <strong>{m.value}</strong>
                  {m.note ? (
                    <span className="text-gray-400"> — {m.note}</span>
                  ) : null}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(m.recordedAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => removeEntry(m._id)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          {metrics.length === 0 && !loading && (
            <p className="text-gray-400">No entries yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorHealthChart;
