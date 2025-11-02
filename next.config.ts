import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['browser-use-sdk'],
  webpack: (config, { isServer }) => {
    // Alias zod/v4 to zod-v4 package to support both zod v3 and v4
    config.resolve.alias = {
      ...config.resolve.alias,
      'zod/v4': require.resolve('zod-v4'),
    };
    
    // Exclude browser-use-sdk from webpack bundling during build (use dynamic import at runtime)
    if (!isServer) {
      config.externals = config.externals || [];
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          ...(Array.isArray(originalExternals) ? originalExternals : []),
          ({ context, request }: any, callback: any) => {
            if (request.includes('browser-use-sdk')) {
              return callback(null, 'commonjs ' + request);
            }
            if (typeof originalExternals === 'function') {
              return originalExternals({ context, request }, callback);
            }
            callback();
          },
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals.push(({ context, request }: any, callback: any) => {
          if (request.includes('browser-use-sdk')) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        });
      }
    }
    
    return config;
  },
};

export default nextConfig;
