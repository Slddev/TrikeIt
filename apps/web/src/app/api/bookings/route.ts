import { createBooking, createBookingInput } from "@/lib/bookings";
import { ApiError, handle, requireApiUser } from "@/lib/api";

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const input = createBookingInput.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      throw new ApiError(400, "Please check the pick-up and drop-off details and contacts.");
    }
    if (input.data.payer === "recipient" && input.data.payment !== "cod") {
      throw new ApiError(400, "When the recipient pays, it's cash on delivery.");
    }
    return createBooking(user.id, input.data);
  });
}
