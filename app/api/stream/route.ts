import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sql = neon(process.env.DATABASE_URL!);
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendUpdate = async () => {
        try {
          const recentLogs = await sql`
            SELECT * FROM fleet_predictions ORDER BY timestamp DESC LIMIT 10;
          `;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(recentLogs)}\n\n`));
        } catch (err) {
          console.error("Stream error:", err);
        }
      };

      // Send initial batch immediately
      await sendUpdate();

      // Poll database state every 3 seconds to push live deltas down the pipe
      const interval = setInterval(sendUpdate, 3000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
