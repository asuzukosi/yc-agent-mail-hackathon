import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  campaigns: defineTable({
    name: v.string(),
    jobDescriptionSummary: v.string(),
    perplexityResearch: v.string(),
    keywords: v.string(),
    persuasionAttackStatus: v.optional(v.string()), // 'not_started', 'running', 'paused'
    createdAt: v.number(),
  }),
  candidates: defineTable({
    campaignId: v.id('campaigns'),
    name: v.string(),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    status: v.optional(v.string()), // 'pending', 'accepted', 'rejected', etc.
    createdAt: v.number(),
  }).index('by_campaign', ['campaignId']),
  agents: defineTable({
    campaignId: v.id('campaigns'),
    email: v.string(),
    target: v.id('candidates'), // Reference to the candidate this agent is interacting with
    status: v.string(), // e.g., 'active', 'idle', 'completed'
    inboxId: v.optional(v.string()), // AgentMail inbox ID
    createdAt: v.number(),
  })
    .index('by_campaign', ['campaignId'])
    .index('by_target', ['target']),
  meetings: defineTable({
    campaignId: v.id('campaigns'),
    candidateId: v.id('candidates'),
    agentId: v.id('agents'),
    status: v.string(), // 'pending', 'completed', 'cancelled'
    scheduledAt: v.optional(v.number()), // Unix timestamp when meeting is scheduled
    completedAt: v.optional(v.number()), // Unix timestamp when meeting is completed
    summary: v.optional(v.string()), // Summary of the meeting
    createdAt: v.number(),
  })
    .index('by_campaign', ['campaignId'])
    .index('by_candidate', ['candidateId'])
    .index('by_agent', ['agentId']),
});
