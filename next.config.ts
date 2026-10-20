import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/labtech/queue",
        destination: "/labtech/requests",
        permanent: true,
      },
      {
        source: "/extra services",
        destination: "/extra-services",
        permanent: true,
      },
      {
        source: "/extra%20services",
        destination: "/extra-services",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
