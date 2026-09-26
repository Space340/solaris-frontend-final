import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL is not defined' },
        { status: 500 }
      );
    }

    const sql = neon(databaseUrl);

    const diurnalRows = await sql`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        AVG(predicted_power_kw) as avg_power_kw
      FROM fleet_predictions
      GROUP BY hour
      ORDER BY hour ASC;
    `;

    const diurnalCurve = Array.from({ length: 24 }, (_, h) => {
      const match = diurnalRows.find((r: any) => Number(r.hour) === h);
      return match ? Math.round(Number(match.avg_power_kw)) : 0;
    });

    const recentLogs = await sql`
      SELECT 
        id,
        plant_id,
        plant_name,
        capacity_mw,
        predicted_power_kw,
        capacity_utilization_pct,
        thermal_loss_percent,
        ramp_alert,
        timestamp
      FROM fleet_predictions
      ORDER BY timestamp DESC
      LIMIT 10;
    `;

    return NextResponse.json({
      diurnalCurve,
      recentLogs
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 
