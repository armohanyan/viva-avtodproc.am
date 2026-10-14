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
    background_color: "#f48633",
    theme_color: "#f48633",
    lang: "hy",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    id: origin,
  };
}
