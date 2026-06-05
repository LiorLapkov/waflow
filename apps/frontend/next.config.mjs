/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @dljobs/shared — workspace-пакет, транспилируем его исходники.
  transpilePackages: ['@dljobs/shared'],
  output: 'standalone',
};

export default nextConfig;
