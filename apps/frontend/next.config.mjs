/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @waflow/shared is a workspace package — transpile its source.
  transpilePackages: ['@waflow/shared'],
  output: 'standalone',
};

export default nextConfig;
