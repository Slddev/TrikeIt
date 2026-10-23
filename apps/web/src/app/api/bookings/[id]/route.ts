import { getBooking } from "@/lib/bookings";
import { handle, requireApiUser } from "@/lib/api";

export async function GET(request: Request, ctx: RouteContext<"/api/bookings/[id]">) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await ctx.params;
    return getBooking(user.id, id);
  });
}
