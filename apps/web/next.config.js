const firebaseProject =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.replace(/\.firebaseapp\.com$/, "") ??
  "zapflow-higor-2026";
const firebaseHost = `${firebaseProject}.firebaseapp.com`;

const staticHosting = process.env.FIREBASE_STATIC === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: staticHosting ? "export" : undefined,
  transpilePackages: ["@zapflow/shared", "@zapflow/firebase"],
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseHost}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${firebaseHost}/__/firebase/:path*`,
      },
    ];
  },
  images: {
    unoptimized: staticHosting,
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudinary.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

module.exports = nextConfig;
