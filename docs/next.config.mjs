import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/nexus-nf' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/nexus-nf/' : '',
};

export default withMDX(config);
