'use client';

import { ConvexProvider as ConvexClientProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexClientProvider client={convex}>{children}</ConvexClientProvider>;
}

