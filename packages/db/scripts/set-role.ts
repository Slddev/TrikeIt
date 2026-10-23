// Usage: bun run set-role <phone or email> <customer|driver|admin>
// Bootstraps the first admin; after that, manage roles from the web dashboard.
import { config } from "dotenv";
config({ path: "../../apps/web/.env.local" });

const [identifier, role] = process.argv.slice(2);
if (!identifier || !["customer", "driver", "admin"].includes(role ?? "")) {
  console.error("Usage: bun run set-role <phone or email> <customer|driver|admin>");
  process.exit(1);
}

const { db, user } = await import("../src/index");
const { eq, or } = await import("drizzle-orm");

const updated = await db
  .update(user)
  .set({ role })
  .where(or(eq(user.phoneNumber, identifier), eq(user.email, identifier)))
  .returning({ id: user.id, name: user.name });

if (!updated.length) {
  console.error(`No user found with phone or email ${identifier}. Sign in once first.`);
  process.exit(1);
}
console.log(`Set ${updated[0].name} (${updated[0].id}) to ${role}.`);
