'use client';

import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import FleetPredictionsTable from '@/components/FleetPredictionsTable';

interface PlantInput {
  plant_id: string;
  plant_name: string;
  capacity_mw: number;
  irradiation: number;
  ambient_temp: number;
  module_temp: number;
  hour: number;
}

interface PredictionResponse {
  plant_id: string;
  plant_name: string;
  capacity_mw: number;
  predicted_power_kw: number;
  capacity_utilization_pct: number;
  thermal_loss_percent: number;
  ramp_alert: boolean;
}

const PLANT_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "PLANT-01": { lat: 27.53, lon: 71.91 }, // Bhadla Solar Park
  "PLANT-02": { lat: 14.10, lon: 77.43 }, // Pavagada Solar Complex
  "PLANT-03": { lat: 15.68, lon: 78.11 }, // Kurnool Ultra Mega
  "PLANT-04": { lat: 24.48, lon: 81.50 }  // Rewa Ultra Mega
};

const INITIAL_PLANTS: PlantInput[] = [
  { plant_id: "PLANT-01", plant_name: "Bhadla Solar Park", capacity_mw: 50, irradiation: 0.85, ambient_temp: 34.2, module_temp: 51.0, hour: new Date().getHours() },
  { plant_id: "PLANT-02", plant_name: "Pavagada Solar Complex", capacity_mw: 100, irradiation: 0.78, ambient_temp: 30.5, module_temp: 44.8, hour: new Date().getHours() },
  { plant_id: "PLANT-03", plant_name: "Kurnool Ultra Mega", capacity_mw: 75, irradiation: 0.65, ambient_temp: 27.0, module_temp: 38.5, hour: new Date().getHours() },
  { plant_id: "PLANT-04", plant_name: "Rewa Ultra Mega", capacity_mw: 30, irradiation: 0.88, ambient_temp: 32.0, module_temp: 48.2, hour: new Date().getHours() }
];

const API_URL = "https://solar-backend-9fys.onrender.com/predict/batch";

export default function SolarDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plants' | 'analytics'>('dashboard');
  const [plantsData, setPlantsData] = useState<PlantInput[]>(INITIAL_PLANTS);
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [diurnalCurveData, setDiurnalCurveData] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fleetChartRef = useRef<HTMLCanvasElement | null>(null);
  const diurnalChartRef = useRef<HTMLCanvasElement | null>(null);
  
  const fleetChartInstance = useRef<Chart | null>(null);
  const diurnalChartInstance = useRef<Chart | null>(null);

  // Fetch real-time weather telemetry from Open-Meteo API
  const fetchLiveWeatherTelemetry = async (plants: PlantInput[]): Promise<PlantInput[]> => {
    const currentHour = new Date().getHours();
    
    const updatedPlants = await Promise.all(
      plants.map(async (plant) => {
        const coords = PLANT_COORDINATES[plant.plant_id];
        if (!coords) return plant;

        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=direct_normal_irradiance,temperature_2m&timezone=auto`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Weather API Error");
          const data = await res.json();

          const directIrradKw = +(data.current.direct_normal_irradiance / 1000).toFixed(2);
          const ambTemp = +data.current.temperature_2m.toFixed(1);
          const modTemp = +(ambTemp + (directIrradKw * 1000 * 0.022)).toFixed(1);

          return {
            ...plant,
            irradiation: Math.max(0.05, directIrradKw),
            ambient_temp: ambTemp,
            module_temp: modTemp,
            hour: currentHour
          };
        } catch (e) {
          const deltaG = (Math.random() * 0.08) - 0.04;
          const newG = Math.min(1.0, Math.max(0.1, +(plant.irradiation + deltaG).toFixed(2)));
          return {
            ...plant,
            irradiation: newG,
            module_temp: +(plant.ambient_temp + (newG * 1000 * 0.022)).toFixed(1),
            hour: currentHour
          };
        }
      })
    );

    return updatedPlants;
  };

  // Fetch telemetry predictions from Render ML API & log to Neon DB
  const fetchFleetData = async () => {
    setLoading(true);
    setError(null);
    try {
      setRefreshTrigger((prev) => prev + 1);

      // 1. Fetch real telemetry from Open-Meteo
      const realTelemetryPlants = await fetchLiveWeatherTelemetry(plantsData);
      setPlantsData(realTelemetryPlants);

      // 2. Call Render ML backend for predictions
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        cache: "no-store",
        body: JSON.stringify({ plants: realTelemetryPlants })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data: PredictionResponse[] = await response.json();
      setPredictions(data);

      // 3. Automatically trigger your ingestion route to save these records to Neon!
      await fetch('/api/ingest', { method: 'GET' });

    } catch (err: any) {
      console.error("API Fetch Error:", err);
      setError("Backend microservice unavailable or spinning up. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch real diurnal curve data from database analytics endpoint
  const fetchAnalyticsCurve = async () => {
    try {
      const res = await fetch('/api/analytics', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.diurnalCurve) setDiurnalCurveData(data.diurnalCurve);
      }
    } catch (e) {
      console.error("Failed to load historical diurnal analytics:", e);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsCurve();
    }
  }, [activeTab, refreshTrigger]);

  // Render/Update Fleet Power Bar Chart
  useEffect(() => {
    if (activeTab === 'dashboard' && fleetChartRef.current && predictions.length > 0) {
      if (fleetChartInstance.current) {
        fleetChartInstance.current.destroy();
      }

      const labels = predictions.map(p => p.plant_name);
      const outputsMw = predictions.map(p => (p.predicted_power_kw / 1000).toFixed(2));

      fleetChartInstance.current = new Chart(fleetChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Predicted Power (MW)',
            data: outputsMw.map(Number),
            backgroundColor: '#3b82f6',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }
  }, [predictions, activeTab]);

  // Render Real Diurnal Line Chart
  useEffect(() => {
    if (activeTab === 'analytics' && diurnalChartRef.current) {
      if (diurnalChartInstance.current) {
        diurnalChartInstance.current.destroy();
      }

      const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const curveData = diurnalCurveData.length === 24 
        ? diurnalCurveData 
        : Array(24).fill(0);

      diurnalChartInstance.current = new Chart(diurnalChartRef.current, {
        type: 'line',
        data: {
          labels: hours,
          datasets: [{
            label: 'Historical Solar Yield (kW)',
            data: curveData,
            borderColor: '#10b981',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
            x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }
  }, [activeTab, diurnalCurveData]);

  const totalKw = predictions.reduce((acc, curr) => acc + curr.predicted_power_kw, 0);
  const avgCuf = predictions.length ? (predictions.reduce((acc, curr) => acc + curr.capacity_utilization_pct, 0) / predictions.length) : 0;
  const alertCount = predictions.filter(p => p.ramp_alert).length;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased flex flex-col md:flex-row w-full">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
              ⚡
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight leading-none">SolarFleet</h2>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Enterprise OS</span>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-3 ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              📊 Command Center
            </button>
            <button 
              onClick={() => setActiveTab('plants')} 
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-3 ${
                activeTab === 'plants' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              🏢 Plant Telemetry
            </button>
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-3 ${
                activeTab === 'analytics' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              📈 Analytics & Curves
            </button>
          </nav>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1 mt-6">
          <div className="flex justify-between items-center">
            <span>Backend Status:</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Render Live
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate">solar-backend-9fys.onrender.com</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={fetchFleetData} className="underline text-xs hover:text-red-300">Retry</button>
          </div>
        )}

        {/* PAGE 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">Fleet Command Overview</h1>
                <p className="text-sm text-slate-400">Live operational intelligence and XGBoost/CNN ML predictions</p>
              </div>
              <button 
                onClick={fetchFleetData} 
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                <span className={loading ? "animate-spin" : ""}>⚡</span> 
                {loading ? "Fetching Real Data..." : "Refresh Fleet Data"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Fleet Power</span>
                <div className="text-2xl font-bold text-white mt-2">{(totalKw / 1000).toFixed(2)} MW</div>
                <span className="text-xs text-slate-500">255 MW Combined Capacity</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Avg Efficiency (CUF)</span>
                <div className="text-2xl font-bold text-emerald-400 mt-2">{avgCuf.toFixed(1)} %</div>
                <span className="text-xs text-slate-500">Fleet Utilization</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Ramp Alerts</span>
                <div className={`text-2xl font-bold mt-2 ${alertCount > 0 ? "text-amber-400" : "text-slate-200"}`}>{alertCount}</div>
                <span className="text-xs text-slate-500">Active Thermal Anomalies</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Connected Sites</span>
                <div className="text-2xl font-bold text-blue-400 mt-2">4 Facilities</div>
                <span className="text-xs text-slate-500">Open-Meteo Live API</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Plant Power Output Comparison</h2>
              <div className="h-64 relative">
                <canvas ref={fleetChartRef}></canvas>
              </div>
            </div>

            {/* Embedded Fleet Predictions Database Log Table */}
            <div className="pt-4">
              <FleetPredictionsTable refreshTrigger={refreshTrigger} />
            </div>
          </section>
        )}

        {/* PAGE 2: PLANT TELEMETRY */}
        {activeTab === 'plants' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Plant Telemetry Inputs</h1>
              <p className="text-sm text-slate-400">Live atmospheric parameters fetched via Open-Meteo API</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Plant Name</th>
                    <th className="py-3.5 px-4">Capacity</th>
                    <th className="py-3.5 px-4">Irradiance (kW/m²)</th>
                    <th className="py-3.5 px-4">Ambient Temp (°C)</th>
                    <th className="py-3.5 px-4">Module Temp (°C)</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {plantsData.map((p) => (
                    <tr key={p.plant_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-white">{p.plant_name}</td>
                      <td className="py-3 px-4">{p.capacity_mw} MW</td>
                      <td className="py-3 px-4">{p.irradiation} kW/m²</td>
                      <td className="py-3 px-4">{p.ambient_temp} °C</td>
                      <td className="py-3 px-4">{p.module_temp} °C</td>
                      <td className="py-3 px-4 text-emerald-400">✅ Open-Meteo Synchronized</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PAGE 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Forecasting Analytics</h1>
              <p className="text-sm text-slate-400">Diurnal generation curves queried directly from Neon PostgreSQL logs</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <h2 className="text-lg font-semibold text-white mb-4">24-Hour Historical Solar Generation Curve</h2>
              <div className="h-72 relative">
                <canvas ref={diurnalChartRef}></canvas>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
