/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@salvaspesa/deal-logic", "@salvaspesa/shared-types"],
};

export default nextConfig;
