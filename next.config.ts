/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pastikan konfigurasi images/lainnya yang sudah ada TETAP DISINI
  // Contoh:
  // images: { domains: ['supabase.co', 'images.unsplash.com'] }, 

  async headers() {
    return [
      {
        // Terapkan aturan ini ke semua rute
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Mengatasi skor -20 (Anti Clickjacking)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Mengatasi skor -5
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            // Mengatasi skor -25. 
            // NOTE: Ini settingan "Aman tapi Longgar" supaya Supabase & AI tetap jalan.
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https:;"
          }
        ]
      }
    ]
  }
};

export default nextConfig;