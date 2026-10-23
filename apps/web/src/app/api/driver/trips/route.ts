import { driverLocation, listDriverTrips } from "@/lib/trips";
import { handle, requireApiDriver } from "@/lib/api";

// GET /api/driver/trips?lng=…&lat=… (the location also updates the driver's last known position)
export async function GET(request: Request) {
  return handle(async () => {
    const driver = await requireApiDriver(request);
    const params = new URL(request.url).searchParams;
    const at = driverLocation.safeParse({
      lng: Number(params.get("lng")),
      lat: Number(params.get("lat")),
    });
    return listDriverTrips(driver.id, at.success ? at.data : undefined);
  });
}
