import type { MetadataRoute } from "next";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${appUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/features`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
