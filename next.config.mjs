/** @type {import('next').NextConfig} */
const nextConfig = {
    // Los console.log se ejecutaban en el navegador de los usuarios y algunos
    // imprimian datos suyos. Se borran de la compilacion de produccion; en
    // desarrollo siguen apareciendo. error y warn se conservan: son avisos
    // reales, no depuracion.
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn'] }
            : false,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
    // Solo activar exportación estática si estamos construyendo para Capacitor
    output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
    distDir: process.env.STATIC_EXPORT === 'true' ? 'out' : '.next',
    skipTrailingSlashRedirect: true,
    // Para static export, necesitamos configurar qué rutas NO se deben pre-renderizar
    ...(process.env.STATIC_EXPORT === 'true' ? {
        experimental: {
            missingSuspenseWithCSRBailout: false,
            serverComponentsExternalPackages: ['pdf-parse'],
        },
    } : {
        experimental: {
            serverComponentsExternalPackages: ['pdf-parse'],
        },
    }),
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

const nextConfigWithHeaders = {
    ...nextConfig,
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' },
                    { key: 'Service-Worker-Allowed', value: '/' },
                ],
            },
            {
                source: '/manifest.json',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' },
                    { key: 'Content-Type', value: 'application/manifest+json' },
                ],
            },
            {
                source: '/((?!sw\\.js|manifest\\.json).*)',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Pragma', value: 'no-cache' },
                    { key: 'Expires', value: '0' },
                ],
            },
        ];
    },
};

export default nextConfigWithHeaders;
