'use client';

import { Toaster as Sonner, ToasterProps } from 'sonner';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      icons={{
        warning: <WarningIcon weight="bold" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

