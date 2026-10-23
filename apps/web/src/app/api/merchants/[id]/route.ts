import { handle, requireApiUser } from "@/lib/api";
import { getMerchant } from "@/lib/merchants";

export async function GET(request: Request, ctx: RouteContext<"/api/merchants/[id]">) {
  return handle(async () => {
    await requireApiUser(request);
    const { id } = await ctx.params;
    return getMerchant(id);
  });
}
