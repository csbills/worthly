import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Worthly — suas finanças",
    short_name: "Worthly",
    description:
      "Organizador de finanças open source: contas, cartões e investimentos via Open Finance.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f6f6",
    theme_color: "#f6f6f6",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Transações", url: "/transactions" },
      { name: "Cartões", url: "/credit-cards" },
      { name: "Investimentos", url: "/investments" },
    ],
  };
}
