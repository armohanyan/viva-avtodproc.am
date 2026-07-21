import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  const origin = siteUrl().origin;
  return {
    name: "Վիվա Ավտոդպրոց | Viva Autoschool",
    short_name: "Viva",
    description:
      "Ավտոդպրոց Երևանում — վարորդական դասեր, տեսություն և քննության պատրաստում։ Driving school in Yerevan, Armenia.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a2332",
    theme_color: "#f48633",
    lang: "hy",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
    id: origin,
  };
}
