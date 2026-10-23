import { buySlots, cancelBooking } from "@/lib/bookings";
import { ApiError, handle, requireApiUser } from "@/lib/api";

export async function POST(request: Request, ctx: RouteContext<"/api/bookings/[id]/[action]">) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id, action } = await ctx.params;
    if (action === "cancel") return cancelBooking(user.id, id);
    if (action === "buy-slots") {
      const body = await request.json().catch(() => null);
      return buySlots(user.id, id, Number(body?.slots));
    }
    throw new ApiError(404, "Unknown action.");
  });
}
