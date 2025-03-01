/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Exclude from file tracing
  outputFileTracingExcludes: {
    '*': ['**/contracts/**'],
  }
};

module.exports = nextConfig; 