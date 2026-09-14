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

const INITIAL_PLANTS: PlantInput[] = [
  { plant_id: "PLANT-01", plant_name: "Bhadla Solar Park", capacity_mw: 50, irradiation: 0.92, ambient_temp: 34.2, module_temp: 51.0, hour: 13 },
  { plant_id: "PLANT-02", plant_name: "Pavagada Solar Complex", capacity_mw: 100, irradiation: 0.78, ambient_temp: 30.5, module_temp: 44.8, hour: 13 },
  { plant_id: "PLANT-03", plant_name: "Kurnool Ultra Mega", capacity_mw: 75, irradiation: 0.41, ambient_temp: 27.0, module_temp: 33.5, hour: 13 },
  { plant_id: "PLANT-04", plant_name: "Rewa Ultra Mega", capacity_mw: 30, irradiation: 0.88, ambient_temp: 32.0, module_temp: 48.2, hour: 13 }
];

const API_URL = "https://solar-backend-9fys.onrender.com/predict/batch";

export default function SolarDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plants' | 'analytics'>('dashboard');
  const [plantsData, setPlantsData] = useState<PlantInput[]>(INITIAL_PLANTS);
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fleetChartRef = useRef<HTMLCanvasElement | null>(null);
  const diurnalChartRef = useRef<HTMLCanvasElement | null>(null);
  
  const fleetChartInstance = useRef<Chart | null>(null);
  const diurnalChartInstance = useRef<Chart | null>(null);

  // Fetch telemetry predictions from Render API
  const fetchFleetData = async () => {
    setLoading(true);
    try {
      // Trigger a refresh in the child FleetPredictionsTable component
      setRefreshTrigger((prev) => prev + 1);

      // Simulate slight weather fluctuations
      const updatedPlants = plantsData.map(p => ({
        ...p,
        irradiation: +(Math.random() * (0.95 - 0.35) + 0.35).toFixed(2),
        module_temp: +(Math.random() * (52.0 - 32.0) + 32.0).toFixed(1)
      }));

      setPlantsData(updatedPlants);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        cache: "no-store",
        body: JSON.stringify({ plants: updatedPlants })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data: PredictionResponse[] = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error("API Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchFleetData();
  }, []);

  // Render/Update Bar Chart for Fleet Overview
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

  // Render Line Chart for Analytics Tab
  useEffect(() => {
    if (activeTab === 'analytics' && diurnalChartRef.current) {
      if (diurnalChartInstance.current) {
        diurnalChartInstance.current.destroy();
      }

      const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const curve = [0,0,0,0,0,2,12,35,60,82,95,100,98,88,70,45,18,3,0,0,0,0,0,0];

      diurnalChartInstance.current = new Chart(diurnalChartRef.current, {
        type: 'line',
        data: {
          labels: hours,
          datasets: [{
            label: 'Diurnal Solar Yield %',
            data: curve,
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
  }, [activeTab]);

  // Aggregate Metrics
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
                {loading ? "Refreshing..." : "Refresh Fleet Data"}
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
                <span className="text-xs text-slate-500">Active Sync</span>
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
              <p className="text-sm text-slate-400">Live environmental parameters per facility</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Plant Name</th>
                    <th className="py-3.5 px-4">Capacity</th>
                    <th className="py-3.5 px-4">Irradiance (kW/m²)</th>
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
                      <td className="py-3 px-4">{p.module_temp} °C</td>
                      <td className="py-3 px-4 text-emerald-400">✅ Active</td>
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
              <p className="text-sm text-slate-400">Diurnal solar radiation curves and performance modeling</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <h2 className="text-lg font-semibold text-white mb-4">24-Hour Solar Generation Curve</h2>
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
