import { z } from "zod";
import { driverLocation, setDriverStatus } from "@/lib/trips";
import { ApiError, handle, requireApiDriver } from "@/lib/api";

const statusInput = z.object({ online: z.boolean(), location: driverLocation.optional() });

export async function POST(request: Request) {
  return handle(async () => {
    const driver = await requireApiDriver(request);
    const input = statusInput.safeParse(await request.json().catch(() => null));
    if (!input.success) throw new ApiError(400, input.error.issues[0]?.message ?? "Invalid status.");
    if (input.data.online && !input.data.location) {
      throw new ApiError(400, "Turn on location to start accepting bookings.");
    }
    return setDriverStatus(driver.id, input.data.online, input.data.location);
  });
}
