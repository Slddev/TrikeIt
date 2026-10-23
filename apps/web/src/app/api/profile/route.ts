import { profileInput, updateProfile } from "@/lib/profile";
import { ApiError, handle, requireApiUser } from "@/lib/api";

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request, { allowIncomplete: true });
    const input = profileInput.safeParse(await request.json().catch(() => null));
    if (!input.success) throw new ApiError(400, input.error.issues[0]?.message ?? "Check your details.");
    await updateProfile(user.id, input.data);
    return { ok: true };
  });
}
