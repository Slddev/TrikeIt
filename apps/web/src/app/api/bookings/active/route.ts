import { getActiveBooking } from "@/lib/bookings";
import { handle, requireApiUser } from "@/lib/api";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    return { booking: await getActiveBooking(user.id) };
  });
}
