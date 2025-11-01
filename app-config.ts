export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // for LiveKit Cloud Sandbox
  sandboxId?: string;
  agentName?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'I think I love my job! 😭',
  pageTitle: 'I think I love my job! 😭 - Meetings',
  pageDescription: 'Voice AI meetings for candidate recruitment',
  
  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/ithinkilovemyjob.png',
  accent: '#3b82f6', // blue highlight
  logoDark: '/ithinkilovemyjob.png',
  accentDark: '#60a5fa', // lighter blue for dark theme
  startButtonText: 'Start Meeting 😈',

  // for LiveKit Cloud Sandbox
  sandboxId: undefined,
  agentName: undefined,
};

