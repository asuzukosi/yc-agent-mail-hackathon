'use client';

import { LayoutDashboard, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUserToken } from '@/lib/hyperspell-client';
import { useState } from 'react';

interface SidebarProps {
  activeTab?: string;
}

export function Sidebar({ activeTab }: SidebarProps) {
  const pathname = usePathname();

  const tabs = [
    {
      id: 'start-campaign',
      label: 'Start Campaign',
      icon: LayoutDashboard,
      href: '/',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Users,
      href: '/campaigns',
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: Calendar,
      href: '/meetings',
    },
  ];

  const getActiveTab = () => {
    if (pathname?.startsWith('/campaigns')) return 'campaigns';
    if (pathname === '/meetings') return 'meetings';
    if (pathname === '/') return 'start-campaign';
    return activeTab;
  };

  const currentActive = getActiveTab();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background">
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="border-b border-border p-6">
          <Link href="/">
            <h2 className="text-xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors">
              I think I love my job! 😭
            </h2>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentActive === tab.id;

            return (
              <Link key={tab.id} href={tab.href}>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
                    'hover:bg-muted/50',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Hyperspell Connect Button */}
        <div className="border-t border-border p-4">
          <HyperspellConnectButton />
        </div>

        {/* Spacer to push content up */}
        <div className="flex-1" />
      </div>
    </aside>
  );
}

function HyperspellConnectButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const token = await getUserToken();
      const redirectUri = typeof window !== 'undefined' ? window.location.href : '';
      const connectUrl = `https://connect.hyperspell.com?token=${token}&redirect_uri=${redirectUri}`;
      window.open(connectUrl, '_blank');
    } catch (error) {
      console.error('Error getting user token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
        'bg-muted/50 hover:bg-muted text-foreground border border-border',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path
          d="M27.963 25.1327C28.1219 25.409 28.0219 25.7361 27.7881 25.8964C27.6981 25.9581 27.5867 25.9958 27.4639 25.996H4.57721C4.13467 25.9958 3.85733 25.5161 4.07819 25.1327L5.30865 23.0009H26.7325L27.963 25.1327ZM25.4542 20.7831C25.4956 20.8557 25.4898 20.9379 25.4522 21.0009H15.8975C15.865 20.9474 15.854 20.8801 15.877 20.8143C16.0196 20.4085 16.1474 19.9952 16.2598 19.576C16.2961 19.4408 16.1927 19.3089 16.0528 19.3085H7.81061C7.64482 19.3083 7.54145 19.1289 7.62408 18.9852L8.76862 16.9999H23.2725L25.4542 20.7831ZM19.794 11.1835C19.8706 11.1838 19.9422 11.2246 19.9805 11.2909L22.0118 14.8143C22.0466 14.8752 22.0469 14.9424 22.0245 14.9999H16.8467C16.8438 14.5065 16.82 14.0176 16.7764 13.535C16.7666 13.4251 16.6739 13.3411 16.5635 13.3407H11.252C11.0865 13.3405 10.9832 13.1612 11.0655 13.0175L12.0606 11.2909C12.0991 11.2244 12.1704 11.1836 12.2471 11.1835H19.794ZM15.5225 5.28894C15.7438 4.90519 16.2974 4.90516 16.5186 5.28894L18.6592 8.99988H15.7305C15.4488 8.25709 15.1204 7.53696 14.7432 6.84753C14.7072 6.78125 14.7086 6.70104 14.7462 6.63562L15.5225 5.28894Z"
          fill="currentColor"
        />
      </svg>
      <span className="font-medium text-sm">
        {isLoading ? 'Connecting...' : 'Connect Hyperspell'}
      </span>
    </button>
  );
}

