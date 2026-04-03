import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { AppContext } from "../context/AppContext";

const METRIC_OPTIONS = {
  weight_kg: "Weight (kg)",
  heart_rate: "Heart rate (bpm)",
  glucose_mg_dl: "Glucose (mg/dL)",
  bp_systolic: "BP Systolic (mmHg)",
  bp_diastolic: "BP Diastolic (mmHg)",
};

const HealthChart = () => {
  const navigate = useNavigate();
  const { token, backendUrl } = useContext(AppContext);

  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMetrics = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const { data } = await axios.get(
        backendUrl + "/api/user/health-metrics",
        { headers: { token } }
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
    if (token) loadMetrics();
  }, [token]);

  // Transform data
  const { weightData, hrData, glucoseData, bpData } = useMemo(() => {
    const rawWeight = [];
    const rawHR = [];
    const rawGlucose = [];
    const bpMap = {}; // Group by short date string

    metrics.forEach((m) => {
      const dateLabel = new Date(m.recordedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const shortDate = new Date(m.recordedAt).toLocaleDateString(); // for BP grouping
      
      const payload = { ...m, dateLabel };

      if (m.metricKey === "weight_kg") rawWeight.push(payload);
      if (m.metricKey === "heart_rate") rawHR.push(payload);
      if (m.metricKey === "glucose_mg_dl") rawGlucose.push(payload);
      
      if (m.metricKey === "bp_systolic" || m.metricKey === "bp_diastolic") {
        if (!bpMap[shortDate]) {
          bpMap[shortDate] = { dateLabel: shortDate, recordedAt: m.recordedAt };
        }
        if (m.metricKey === "bp_systolic") bpMap[shortDate].systolic = m.value;
        if (m.metricKey === "bp_diastolic") bpMap[shortDate].diastolic = m.value;
      }
    });

    return {
      weightData: rawWeight.sort((a,b)=>a.recordedAt - b.recordedAt),
      hrData: rawHR.sort((a,b)=>a.recordedAt - b.recordedAt),
      glucoseData: rawGlucose.sort((a,b)=>a.recordedAt - b.recordedAt),
      bpData: Object.values(bpMap).sort((a,b)=>a.recordedAt - b.recordedAt)
    };
  }, [metrics]);

  if (!token) {
    return (
      <div className="my-10 text-center max-w-lg mx-auto">
        <p className="text-gray-600 mb-4">
          Sign in to view your health dashboard.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-primary text-white px-8 py-3 rounded-full shadow-md hover:scale-105 transition-all"
        >
          Sign in
        </button>
      </div>
    );
  }

  // A tiny helper to render elegant gradient Area Charts
  const renderAreaChart = (data, dataKey, color, name, gradientId) => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#${gradientId})`} name={name} activeDot={{ r: 6, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <div className="my-6 max-w-6xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Health Dashboard</h1>
        <p className="text-gray-500 text-sm">
          A comprehensive overview of your vital metrics.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Heart Rate Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">❤️ Heart Rate</h2>
              {hrData.length > 0 && <span className="text-2xl font-bold text-red-500">{hrData[hrData.length-1].value} <span className="text-xs font-normal text-gray-400">bpm</span></span>}
            </div>
            {hrData.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-16 text-center">No readings yet.</p>
            ) : (
                <div className="h-[240px]">
                  {renderAreaChart(hrData, "value", "#EF4444", "Heart Rate", "colorHR")}
                </div>
            )}
          </div>

          {/* Blood Pressure Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">🩸 Blood Pressure</h2>
            </div>
            {bpData.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-16 text-center">No readings yet.</p>
            ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="systolic" stroke="#6366F1" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Systolic" />
                      <Line type="monotone" dataKey="diastolic" stroke="#8B5CF6" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Diastolic" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            )}
          </div>

          {/* Weight Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">⚖️ Body Weight</h2>
              {weightData.length > 0 && <span className="text-2xl font-bold text-teal-500">{weightData[weightData.length-1].value} <span className="text-xs font-normal text-gray-400">kg</span></span>}
            </div>
            {weightData.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-16 text-center">No readings yet.</p>
            ) : (
                <div className="h-[240px]">
                  {renderAreaChart(weightData, "value", "#14B8A6", "Weight", "colorWeight")}
                </div>
            )}
          </div>

          {/* Glucose Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">🍭 Blood Glucose</h2>
              {glucoseData.length > 0 && <span className="text-2xl font-bold text-amber-500">{glucoseData[glucoseData.length-1].value} <span className="text-xs font-normal text-gray-400">mg/dL</span></span>}
            </div>
            {glucoseData.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-16 text-center">No readings yet.</p>
            ) : (
                <div className="h-[240px]">
                  {renderAreaChart(glucoseData, "value", "#F59E0B", "Glucose", "colorGlucose")}
                </div>
            )}
          </div>

        </div>
      )}

      {/* Recent Timeline */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-12">
        <h2 className="font-semibold text-gray-800 text-lg mb-4 flex items-center gap-2">🕒 Recent Timeline</h2>
        <div className="max-h-72 overflow-y-auto pr-2">
          {metrics.length === 0 && !loading ? (
             <p className="text-gray-400 text-sm italic py-4">No timeline events recorded.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[...metrics]
                .sort((a, b) => b.recordedAt - a.recordedAt)
                .slice(0, 30)
                .map((m) => (
                  <div key={m._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100/50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">
                        {METRIC_OPTIONS[m.metricKey] || m.metricKey}
                        <span className="ml-2 text-primary font-bold">{m.value}</span>
                      </span>
                      {m.note && <span className="text-sm text-gray-500 flex mt-0.5">📝 {m.note}</span>}
                    </div>
                    <div className="flex flex-col sm:items-end mt-2 sm:mt-0 text-xs text-gray-400">
                      <span>{new Date(m.recordedAt).toLocaleString()}</span>
                      {m.recordedByDocId && <span className="text-primary bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block">👨‍⚕️ Doctor logged</span>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default HealthChart;
