// The public address, for canonical links, the sitemap and social previews.
export const SITE_URL = new URL(
  process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    "http://localhost:3000",
);

export const SITE_NAME = "TrikeIt!";
export const SITE_TITLE = "TrikeIt! – Tricycle parcel and food delivery in the Philippines";
export const SITE_DESCRIPTION =
  "Book a local TODA tricycle to deliver your parcel or order from stores near you. Batch with other deliveries from ₱12, or send it Express right away.";
