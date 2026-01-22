/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['app.sandbox.midtrans.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self'; 
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.sandbox.midtrans.com https://api.midtrans.com; 
              style-src 'self' 'unsafe-inline'; 
              img-src 'self' blob: data:; 
              font-src 'self'; 
              object-src 'none'; 
              base-uri 'self'; 
              form-action 'self'; 
              frame-ancestors 'none'; 
              frame-src 'self' https://app.sandbox.midtrans.com https://api.midtrans.com; 
              connect-src 'self' https://app.sandbox.midtrans.com https://api.midtrans.com https://*.supabase.co wss://*.supabase.co;
            `.replace(/\s{2,}/g, ' ').trim() 
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;