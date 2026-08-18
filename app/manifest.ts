import type { MetadataRoute } from "next";

import { appTexts } from "@/src/shared/constants/texts";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appTexts.nomeProduto} Admin`,
    short_name: appTexts.nomeProduto,
    description: appTexts.descricaoProduto,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
