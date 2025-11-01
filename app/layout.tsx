import type { Metadata } from 'next';
import './globals.css';
import { ConvexProvider } from '@/components/convex-provider';

export const metadata: Metadata = {
  title: 'I think I love my job! 😭',
  description: 'Automated candidate search and recruitment pipeline',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased dark">
        <ConvexProvider>{children}</ConvexProvider>
      </body>
    </html>
  );
}