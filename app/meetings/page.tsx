'use client';

import { App } from '@/components/app/app';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { Sidebar } from '@/components/sidebar';

export default function MeetingsPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab="meetings" />
      <main className="flex-1 ml-64">
        <div className="h-screen">
          <App appConfig={APP_CONFIG_DEFAULTS} />
        </div>
      </main>
    </div>
  );
}

