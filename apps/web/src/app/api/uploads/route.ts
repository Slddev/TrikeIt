import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ApiError, handle, requireApiUser } from "@/lib/api";
import { getOwnMerchant, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/merchants";

// Issues short-lived tokens so the merchant's browser can upload photos straight to Vercel Blob.
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    if (user.role !== "merchant") throw new ApiError(403, "Only merchants can upload photos.");
    const store = await getOwnMerchant(user.id);
    if (!store) throw new ApiError(403, "You don't have a store.");

    const body = (await request.json()) as HandleUploadBody;
    return handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`merchants/${store.id}/`)) throw new ApiError(400, "Invalid upload path.");
        return { allowedContentTypes: IMAGE_TYPES, maximumSizeInBytes: MAX_IMAGE_BYTES, addRandomSuffix: true };
      },
    });
  });
}
