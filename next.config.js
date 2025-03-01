/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Exclude from file tracing
  outputFileTracingExcludes: {
    '*': ['**/contracts/**'],
  },

  experimental: {
    serverComponentsExternalPackages: ['tweetnacl', '@web3-storage/w3up-client']
  }
};

module.exports = nextConfig; 