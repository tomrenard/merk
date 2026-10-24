import { ImageResponse } from "next/og";
import { SPLASH_SIZES } from "@/lib/iphones";

// Built once at build time; any other size is a 404, so nobody can make the server render.
export const dynamicParams = false;
export const generateStaticParams = () => SPLASH_SIZES.map((size) => ({ size }));

/** Launch screen for one iPhone size ("1179x2556"): the icon's violet into the app's blue, a glass "m". */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const [w = 0, h = 0] = (await params).size.split("x").map(Number);
  const mark = Math.round(w * 0.3);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #7c4dff, #2f6bff 70%, #2459e0)",
      }}
    >
      <div
        style={{
          width: mark,
          height: mark,
          borderRadius: Math.round(mark * 0.28),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,.1))",
          border: "3px solid rgba(255,255,255,.55)",
          color: "#fff",
          fontSize: Math.round(mark * 0.62),
          fontWeight: 900,
          paddingBottom: Math.round(mark * 0.08),
        }}
      >
        m
      </div>
    </div>,
    { width: w, height: h, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
