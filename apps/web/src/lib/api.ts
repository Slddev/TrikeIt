import "server-only";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth";
import { accountGaps } from "@/lib/profile";

/** Thrown by data functions; route handlers turn it into a JSON error response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The signed-in user; unless `allowIncomplete`, their account must be fully set up. */
export async function requireApiUser(request: Request, { allowIncomplete = false } = {}) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new ApiError(401, "Please sign in again.");
  const gaps = accountGaps(session.user);
  if (!allowIncomplete && (gaps.needsPhone || gaps.needsDetails)) {
    throw new ApiError(403, "Finish setting up your account first.");
  }
  return session.user;
}

export async function requireApiDriver(request: Request) {
  const user = await requireApiUser(request);
  if (user.role !== "driver") throw new ApiError(403, "Only approved riders can do that.");
  return user;
}

/** Runs a route handler body and maps thrown errors to JSON responses. */
export async function handle(run: () => Promise<unknown>) {
  try {
    return Response.json(await run());
  } catch (error) {
    // Let Next.js internals through, e.g. the signal that stops prerendering a dynamic route.
    unstable_rethrow(error);
    if (error instanceof ApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
