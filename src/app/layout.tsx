import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Taskbar from '@/components/layout/taskbar';
import MobileNav from '@/components/layout/mobile-nav';
import ClientProvider from '@/components/layout/ClientProvider';
import { AuthProvider } from '@/components/apps/mi-hogar/auth-context';
import { WorkSessionProvider } from '@/context/work-session-context';
import CookieBanner from '@/components/cookie-banner';

export const metadata: Metadata = {
  title: 'Quioba — El sistema operativo para tu vida personal y familiar',
  description:
    'Quioba integra lista de la compra, economía personal, botiquín, Campus escolar, tareas y más de 15 apps en un solo lugar. Organiza tu vida y la de tu familia.',
  keywords: 'organización familiar, gestión personal, lista de la compra, mi economía, campus escolar, botiquín digital',
  authors: [{ name: 'Quioba' }],
  metadataBase: new URL('https://www.quioba.com'),
  openGraph: {
    type: 'website',
    url: 'https://www.quioba.com',
    siteName: 'Quioba',
    title: 'Quioba — El sistema operativo para tu vida personal y familiar',
    description:
      'Más de 15 apps integradas: lista de la compra, economía personal, botiquín, Campus escolar y más. Todo conectado en un solo lugar.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Quioba — Sistema operativo para tu vida personal y familiar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quioba — El sistema operativo para tu vida personal y familiar',
    description:
      'Más de 15 apps integradas: lista de la compra, economía personal, botiquín, Campus escolar y más.',
    images: ['/og-image.png'],
    creator: '@quioba',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/images/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/images/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale y userScalable eliminados: violaban WCAG 2.1 (criterio 1.4.4)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>

        {/* PostHog Analytics */}
        {posthogKey && (
          <Script id="posthog-init" strategy="afterInteractive">
            {`
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
              posthog.init('${posthogKey}', { api_host: '${posthogHost}', person_profiles: 'identified_only' });
            `}
          </Script>
        )}

        <AuthProvider>
          <WorkSessionProvider>
            <ClientProvider>
              <div className="print:hidden">
                <Header />
              </div>
              <main>{children}</main>
              <div className="print:hidden">
                <Footer />
                <Taskbar />
                <MobileNav />
              </div>
              <Toaster />
              <SonnerToaster
                position="top-right"
                gap={8}
                toastOptions={{
                  unstyled: true,
                  classNames: {
                    toast: 'w-full',
                  },
                }}
              />
              <CookieBanner />
            </ClientProvider>
          </WorkSessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
