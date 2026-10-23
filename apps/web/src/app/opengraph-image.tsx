import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = "TrikeIt! – Deliveries by your local trike.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: 96,
          background: "linear-gradient(180deg, #FFE891 0%, #FFF8E4 70%, #FFFFFF 100%)",
          color: "#0B0F3F",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={300} height={267} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ fontSize: 88, fontWeight: 700 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.15 }}>Deliveries by your local trike.</div>
          <div style={{ fontSize: 30, opacity: 0.7 }}>Parcels and store orders, delivered by TODA riders.</div>
        </div>
      </div>
    ),
    size,
  );
}
