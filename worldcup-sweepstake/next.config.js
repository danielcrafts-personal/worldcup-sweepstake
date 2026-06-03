const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Flags are rendered with plain <img> from flagcdn.com; skip ESLint's
  // no-img-element rule blocking production builds.
  eslint: { ignoreDuringBuilds: true },
  // Pin the project root (a stray lockfile in the home dir confuses inference).
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
