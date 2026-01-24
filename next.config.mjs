import nextPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: "standalone",
};

export default nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
})(nextConfig);
