export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GlobalWithGc = typeof globalThis & {
  gc?: () => void;
};

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldCollect = searchParams.get("gc") === "1";
  const collectGarbage = (globalThis as GlobalWithGc).gc;

  if (shouldCollect && collectGarbage) {
    collectGarbage();
  }

  const memory = process.memoryUsage();

  return Response.json({
    pid: process.pid,
    gcAvailable: typeof collectGarbage === "function",
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers,
  });
}
