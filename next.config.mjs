/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // ← This is the magic line for Docker + Azure
  reactStrictMode: true,
};

export default nextConfig;