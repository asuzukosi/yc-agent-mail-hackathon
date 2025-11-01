import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { jobDescriptionExtractionAgent } from './agents/job-description-extraction-agent';
import { linkedinQueryExtractionAgent } from './agents/linkedin-query-extraction-agent';
import { persuasionEmailAgent } from './agents/persuasion-email-agent';
import { campaignAssistantAgent } from './agents/campaign-assistant-agent';

export const mastra = new Mastra({
  agents: {
    jobDescriptionExtractionAgent,
    linkedinQueryExtractionAgent,
    persuasionEmailAgent,
    campaignAssistantAgent,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage (not persisted)
    url: ':memory:',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: {
    default: {
      enabled: true,
    },
  },
});
