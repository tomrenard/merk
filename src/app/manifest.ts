import type { MetadataRoute } from "next";
import { getT } from "@/lib/locale";

/** In the device's UI language, read when the phone installs the app. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getT();
  return {
    name: "merk",
    short_name: "merk",
    description: t("Learn a language, one card at a time."),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c4dff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
