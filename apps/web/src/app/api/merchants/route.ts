import { handle, requireApiUser } from "@/lib/api";
import type { LngLat } from "@/lib/geo";
import { listMerchants } from "@/lib/merchants";

export async function GET(request: Request) {
  return handle(async () => {
    await requireApiUser(request);
    const params = new URL(request.url).searchParams;
    const near: LngLat = [Number(params.get("lng")), Number(params.get("lat"))];
    const hasNear = params.has("lng") && params.has("lat") && near.every(Number.isFinite);
    return { merchants: await listMerchants(hasNear ? near : null) };
  });
}
