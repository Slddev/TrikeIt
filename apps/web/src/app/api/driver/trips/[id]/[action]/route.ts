import { z } from "zod";
import { acceptTrip, confirmDropoff, confirmPickup, declineTrip, driverLocation } from "@/lib/trips";
import { ApiError, handle, requireApiDriver } from "@/lib/api";

const actionInput = z.object({
  location: driverLocation,
  bookingId: z.string().optional(),
  stopIndex: z.number().int().min(0).default(0),
});

export async function POST(request: Request, ctx: RouteContext<"/api/driver/trips/[id]/[action]">) {
  return handle(async () => {
    const driver = await requireApiDriver(request);
    const { id, action } = await ctx.params;
    const input = actionInput.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      throw new ApiError(400, input.error.issues[0]?.message ?? "Your location is needed for this.");
    }
    const { location, bookingId, stopIndex } = input.data;

    switch (action) {
      case "accept":
        return acceptTrip(driver.id, id, location);
      case "decline":
        return declineTrip(driver.id, id, location);
      case "pickup":
      case "dropoff":
        if (!bookingId) throw new ApiError(400, "Which rider?");
        return action === "pickup"
          ? confirmPickup(driver.id, id, bookingId, location)
          : confirmDropoff(driver.id, id, bookingId, stopIndex, location);
      default:
        throw new ApiError(404, "Unknown action.");
    }
  });
}
