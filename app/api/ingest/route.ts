import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    const sql = neon(databaseUrl);

    // Your 4 solar plant locations and capacities
    const plants = [
      { id: 'PLANT_01', name: 'Bhadla Solar Park', lat: 27.54, lon: 71.91, cap: 50.0 },
      { id: 'PLANT_02', name: 'Pavagada Solar Complex', lat: 14.12, lon: 77.27, cap: 100.0 },
      { id: 'PLANT_03', name: 'Kurnool Ultra Mega', lat: 15.66, lon: 78.04, cap: 75.0 },
      { id: 'PLANT_04', name: 'Rewa Ultra Mega', lat: 24.53, lon: 81.30, cap: 30.0 },
    ];

    for (const plant of plants) {
      // Fetch live weather from Open-Meteo API
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${plant.lat}&longitude=${plant.lon}&current=temperature_2m,shortwave_radiation`
      );
      const weather = await res.json();
      
      const irradiance = weather.current?.shortwave_radiation || 500; 
      const temp = weather.current?.temperature_2m || 30; 

      // Calculate predicted power output and metrics
      const predictedPowerKw = Math.round(plant.cap * 1000 * (irradiance / 1000) * 0.85);
      const cuf = Number(((predictedPowerKw / (plant.cap * 1000)) * 100).toFixed(1));
      const thermalLoss = Number((Math.max(0, (temp - 25) * 0.2)).toFixed(1));
      const rampAlert = irradiance > 800 && temp > 38;

      // Insert record into Neon PostgreSQL database
      await sql`
        INSERT INTO fleet_predictions (
          plant_id, plant_name, capacity_mw, predicted_power_kw, 
          capacity_utilization_pct, thermal_loss_percent, ramp_alert, timestamp
        ) VALUES (
          ${plant.id}, ${plant.name}, ${plant.cap}, ${predictedPowerKw}, 
          ${cuf}, ${thermalLoss}, ${rampAlert}, NOW()
        );
      `;
    }

    return NextResponse.json({ success: true, message: 'Live telemetry ingested successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
