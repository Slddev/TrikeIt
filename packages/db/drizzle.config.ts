import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../apps/web/.env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});