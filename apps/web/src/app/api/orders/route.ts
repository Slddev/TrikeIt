import { ApiError, handle, requireApiUser } from "@/lib/api";
import { placeOrder, placeOrderInput } from "@/lib/merchants";

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const input = placeOrderInput.safeParse(await request.json().catch(() => null));
    if (!input.success) throw new ApiError(400, "Please check your basket and delivery address.");
    return placeOrder(user.id, input.data);
  });
}
