"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Database, AlertCircle, Sun } from "lucide-react";

interface PredictionRecord {
  id: number;
  plant_id: string;
  irradiance: number;
  temperature: number;
  predicted_power_mw: number;
  timestamp: string;
}

interface FleetPredictionsTableProps {
  refreshTrigger?: number; // Listens to refresh actions from app/page.tsx
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function FleetPredictionsTable({ refreshTrigger }: FleetPredictionsTableProps) {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/predictions?limit=15`);
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data: PredictionRecord[] = await res.json();
      setPredictions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load prediction logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [refreshTrigger]); // Re-fetches data whenever parent increments refreshTrigger

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight">Neon Database Telemetry Logs</h2>
        </div>
        <button
          onClick={fetchPredictions}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Error View */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-sm mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 uppercase text-xs tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Plant ID</th>
              <th className="px-4 py-3">Irradiance (W/m²)</th>
              <th className="px-4 py-3">Temp (°C)</th>
              <th className="px-4 py-3">Output (MW)</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {predictions.length > 0 ? (
              predictions.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{row.id}</td>
                  <td className="px-4 py-3 font-semibold text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      {row.plant_id.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.irradiance.toFixed(1)}</td>
                  <td className="px-4 py-3">{row.temperature.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">
                    {row.predicted_power_mw.toFixed(4)} MW
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {row.timestamp ? new Date(row.timestamp).toLocaleString() : "N/A"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  {loading ? "Loading database logs..." : "No prediction logs found in Neon PostgreSQL."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
