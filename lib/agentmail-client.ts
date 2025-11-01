/**
 * AgentMail API Client
 * 
 * Documentation:
 * - Inboxes: https://docs.agentmail.to/inboxes
 * - Messages: https://docs.agentmail.to/messages
 * - Threads: https://docs.agentmail.to/threads
 * - Drafts: https://docs.agentmail.to/drafts
 */

import { AgentMailClient } from 'agentmail';

// ============================================================================
// Types
// ============================================================================

export interface AgentMailInbox {
  inbox_id: string;
  email_address: string;
  username?: string;
  domain?: string;
  created_at?: string;
}

export interface AgentMailMessage {
  message_id: string;
  thread_id: string;
  inbox_id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  text?: string;
  html?: string;
  labels?: string[];
  created_at?: string;
}

export interface AgentMailThread {
  thread_id: string;
  inbox_id: string;
  subject: string;
  participants: string[];
  message_count?: number;
  latest_message?: AgentMailMessage;
  created_at?: string;
}

export interface AgentMailDraft {
  draft_id: string;
  inbox_id: string;
  subject?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  text?: string;
  html?: string;
  created_at?: string;
}

export interface SendMessageOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  labels?: string[];
}

export interface ReplyMessageOptions {
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface CreateInboxOptions {
  username?: string;
  domain?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getApiKey(): string {
  if (!process.env.AGENTMAIL_API_KEY) {
    throw new Error('AGENTMAIL_API_KEY is not set');
  }
  return process.env.AGENTMAIL_API_KEY;
}

function getClient(): AgentMailClient {
  return new AgentMailClient({ apiKey: getApiKey() });
}

function normalizeArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// ============================================================================
// Inboxes
// ============================================================================

/**
 * Create a new inbox
 * @param options Optional inbox configuration (username, domain)
 * @returns Created inbox
 */
export async function createInbox(
  options?: CreateInboxOptions,
): Promise<AgentMailInbox> {
  const client = getClient();
  const result = await client.inboxes.create({
    username: options?.username,
    domain: options?.domain,
  });
  
  console.log('AgentMail createInbox result:', result);
  
  // The SDK returns inboxId as the property
  return {
    inbox_id: result.inboxId,
    email_address: result.inboxId, // InboxId is the email address
    username: options?.username,
    domain: options?.domain,
    created_at: result.createdAt.toISOString(),
  };
}

/**
 * Get a specific inbox by ID
 * @param inboxId Inbox ID (email address or inbox ID)
 * @returns Inbox details
 */
export async function getInbox(
  inboxId: string,
): Promise<AgentMailInbox> {
  const client = getClient();
  const result = await client.inboxes.get(inboxId);
  
  return {
    inbox_id: result.inboxId,
    email_address: result.inboxId,
    created_at: result.createdAt.toISOString(),
  };
}

/**
 * List all inboxes in the organization
 * @returns List of inboxes
 */
export async function listInboxes(): Promise<{
  inboxes: AgentMailInbox[];
  count: number;
}> {
  const client = getClient();
  const result = await client.inboxes.list();
  
  return {
    inboxes: result.inboxes.map((inbox) => ({
      inbox_id: inbox.inboxId,
      email_address: inbox.inboxId,
      created_at: inbox.createdAt.toISOString(),
    })),
    count: result.count,
  };
}

// ============================================================================
// Messages
// ============================================================================

/**
 * Send a new message from an inbox
 * Creates a new thread and returns the message
 * @param inboxId Inbox ID to send from
 * @param options Message options (to, subject, text, html, cc, bcc, labels)
 * @returns Sent message
 */
export async function sendMessage(
  inboxId: string,
  options: SendMessageOptions,
): Promise<AgentMailMessage> {
  const client = getClient();
  const result = await client.inboxes.messages.send(inboxId, {
    to: normalizeArray(options.to),
    subject: options.subject,
    text: options.text,
    html: options.html,
    cc: options.cc ? normalizeArray(options.cc) : undefined,
    bcc: options.bcc ? normalizeArray(options.bcc) : undefined,
    labels: options.labels,
  });

  // SendMessageResponse only returns messageId and threadId
  // Build a minimal message object from what we have
  const toArray = normalizeArray(options.to);
  
  return {
    message_id: result.messageId,
    thread_id: result.threadId,
    inbox_id: inboxId,
    subject: options.subject,
    from: inboxId, // The inbox email is the sender
    to: toArray,
    cc: options.cc ? normalizeArray(options.cc) : undefined,
    bcc: options.bcc ? normalizeArray(options.bcc) : undefined,
    text: options.text,
    html: options.html,
    labels: options.labels || [],
    created_at: new Date().toISOString(),
  };
}

/**
 * List all messages in an inbox
 * @param inboxId Inbox ID
 * @returns List of messages
 */
export async function listMessages(
  inboxId: string,
): Promise<{
  messages: AgentMailMessage[];
  count: number;
}> {
  const client = getClient();
  const result = await client.inboxes.messages.list(inboxId);

  return {
    messages: result.messages.map((msg) => ({
      message_id: msg.messageId,
      thread_id: msg.threadId,
      inbox_id: msg.inboxId,
      subject: msg.subject || '',
      from: msg.from, // MessageFrom is already a string
      to: msg.to, // MessageTo is already string[]
      cc: msg.cc, // MessageCc is already string[]
      bcc: msg.bcc, // MessageBcc is already string[]
      text: undefined, // MessageItem doesn't have text/html, use getMessage for full content
      html: undefined,
      labels: msg.labels, // MessageLabels is already string[]
      created_at: msg.createdAt.toISOString(),
    })),
    count: result.count,
  };
}

/**
 * Reply to an existing message
 * Adds the new message to the existing thread
 * @param inboxId Inbox ID to send from
 * @param messageId Message ID to reply to
 * @param options Reply options (text, html, cc, bcc, attachments)
 * @returns Reply message
 */
export async function replyToMessage(
  inboxId: string,
  messageId: string,
  options: ReplyMessageOptions,
): Promise<AgentMailMessage> {
  const client = getClient();
  const result = await client.inboxes.messages.reply(
    inboxId,
    messageId,
    {
    text: options.text,
    html: options.html,
    cc: options.cc ? normalizeArray(options.cc) : undefined,
    bcc: options.bcc ? normalizeArray(options.bcc) : undefined,
    attachments: options.attachments?.map((att) => ({
      content: typeof att.content === 'string' 
        ? att.content 
        : Buffer.from(att.content).toString('base64'),
      })),
    }
  );

  // Reply only returns messageId and threadId, build minimal message object
  return {
    message_id: result.messageId,
    thread_id: result.threadId,
    inbox_id: inboxId,
    subject: '', // Subject would be from original message
    from: inboxId,
    to: [],
    cc: options.cc ? normalizeArray(options.cc) : undefined,
    bcc: options.bcc ? normalizeArray(options.bcc) : undefined,
    text: options.text,
    html: options.html,
    labels: [],
    created_at: new Date().toISOString(),
  };
}

/**
 * Get a specific message
 * @param inboxId Inbox ID
 * @param messageId Message ID
 * @returns Message details
 */
export async function getMessage(
  inboxId: string,
  messageId: string,
): Promise<AgentMailMessage> {
  const client = getClient();
  const result = await client.inboxes.messages.get(inboxId, messageId);

  return {
    message_id: result.messageId,
    thread_id: result.threadId,
    inbox_id: result.inboxId,
    subject: result.subject || '',
    from: result.from, // MessageFrom is string
    to: result.to, // MessageTo is string[]
    cc: result.cc, // MessageCc is string[] | undefined
    bcc: result.bcc, // MessageBcc is string[] | undefined
    text: result.text,
    html: result.html,
    labels: result.labels, // MessageLabels is string[]
    created_at: result.createdAt.toISOString(),
  };
}

// ============================================================================
// Threads
// ============================================================================

/**
 * List all threads in an inbox
 * @param inboxId Inbox ID
 * @returns List of threads
 */
export async function listThreads(
  inboxId: string,
): Promise<{
  threads: AgentMailThread[];
  count: number;
}> {
  const client = getClient();
  const result = await client.inboxes.threads.list(inboxId);

  return {
    threads: result.threads.map((thread) => ({
      thread_id: thread.threadId,
      inbox_id: thread.inboxId,
      subject: thread.subject || '',
      participants: [...(thread.senders || []), ...(thread.recipients || [])],
      message_count: thread.messageCount,
      created_at: thread.createdAt.toISOString(),
    })),
    count: result.count,
  };
}

/**
 * Get a specific thread
 * @param inboxId Inbox ID
 * @param threadId Thread ID
 * @returns Thread details
 */
export async function getThread(
  inboxId: string,
  threadId: string,
): Promise<AgentMailThread> {
  const client = getClient();
  const result = await client.inboxes.threads.get(inboxId, threadId);

  const lastMessage = result.messages && result.messages.length > 0 
    ? result.messages[result.messages.length - 1] 
    : null;

  return {
    thread_id: result.threadId,
    inbox_id: result.inboxId,
    subject: result.subject || '',
    participants: [...(result.senders || []), ...(result.recipients || [])],
    message_count: result.messageCount,
    latest_message: lastMessage ? {
      message_id: lastMessage.messageId,
      thread_id: lastMessage.threadId,
      inbox_id: lastMessage.inboxId,
      subject: lastMessage.subject || '',
      from: lastMessage.from, // MessageFrom is string
      to: lastMessage.to, // MessageTo is string[]
      cc: lastMessage.cc, // MessageCc is string[] | undefined
      bcc: lastMessage.bcc, // MessageBcc is string[] | undefined
      text: lastMessage.text,
      html: lastMessage.html,
      labels: lastMessage.labels, // MessageLabels is string[]
      created_at: lastMessage.createdAt.toISOString(),
    } : undefined,
    created_at: result.createdAt.toISOString(),
  };
}

// ============================================================================
// Drafts
// ============================================================================

/**
 * Create a draft message
 * @param inboxId Inbox ID
 * @param options Draft options (to, subject, text, html, cc, bcc)
 * @returns Created draft
 */
export async function createDraft(
  inboxId: string,
  options: {
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
  },
): Promise<AgentMailDraft> {
  const client = getClient();
  const result = await client.inboxes.drafts.create(inboxId, {
    to: options.to ? normalizeArray(options.to) : undefined,
    subject: options.subject,
    text: options.text,
    html: options.html,
    cc: options.cc ? normalizeArray(options.cc) : undefined,
    bcc: options.bcc ? normalizeArray(options.bcc) : undefined,
  });

  return {
    draft_id: result.draftId,
    inbox_id: result.inboxId,
    subject: result.subject,
    to: result.to, // DraftTo is string[]
    cc: result.cc, // DraftCc is string[]
    bcc: result.bcc, // DraftBcc is string[]
    text: result.text,
    html: result.html,
    created_at: result.createdAt.toISOString(),
  };
}

/**
 * List all drafts in an inbox
 * @param inboxId Inbox ID
 * @returns List of drafts
 */
export async function listDrafts(
  inboxId: string,
): Promise<{
  drafts: AgentMailDraft[];
  count: number;
}> {
  const client = getClient();
  const result = await client.inboxes.drafts.list(inboxId);

  return {
    drafts: result.drafts.map((draft) => ({
      draft_id: draft.draftId,
      inbox_id: draft.inboxId,
      subject: draft.subject,
      to: draft.to, // DraftTo is string[]
      cc: draft.cc, // DraftCc is string[]
      bcc: draft.bcc, // DraftBcc is string[]
      text: undefined, // DraftItem doesn't have text/html
      html: undefined,
      created_at: undefined, // DraftItem doesn't have createdAt
    })),
    count: result.count,
  };
}

/**
 * Get a specific draft
 * @param inboxId Inbox ID
 * @param draftId Draft ID
 * @returns Draft details
 */
export async function getDraft(
  inboxId: string,
  draftId: string,
): Promise<AgentMailDraft> {
  const client = getClient();
  const result = await client.inboxes.drafts.get(inboxId, draftId);

  return {
    draft_id: result.draftId,
    inbox_id: result.inboxId,
    subject: result.subject,
    to: result.to, // DraftTo is string[]
    cc: result.cc, // DraftCc is string[]
    bcc: result.bcc, // DraftBcc is string[]
    text: result.text,
    html: result.html,
    created_at: result.createdAt.toISOString(),
  };
}

/**
 * Update a draft
 * @param inboxId Inbox ID
 * @param draftId Draft ID
 * @param options Updated draft options
 * @returns Updated draft
 */
export async function updateDraft(
  inboxId: string,
  draftId: string,
  options: {
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
  },
): Promise<AgentMailDraft> {
  const client = getClient();
  const result = await client.inboxes.drafts.update(inboxId, draftId, {
    to: options.to ? normalizeArray(options.to) : undefined,
    subject: options.subject,
    text: options.text,
    html: options.html,
    cc: options.cc ? normalizeArray(options.cc) : undefined,
    bcc: options.bcc ? normalizeArray(options.bcc) : undefined,
  });

  return {
    draft_id: result.draftId,
    inbox_id: result.inboxId,
    subject: result.subject,
    to: result.to, // DraftTo is string[]
    cc: result.cc, // DraftCc is string[]
    bcc: result.bcc, // DraftBcc is string[]
    text: result.text,
    html: result.html,
    created_at: result.createdAt.toISOString(),
  };
}

/**
 * Send a draft (convert draft to sent message)
 * @param inboxId Inbox ID
 * @param draftId Draft ID
 * @returns Sent message
 */
export async function sendDraft(
  inboxId: string,
  draftId: string,
): Promise<AgentMailMessage> {
  const client = getClient();
  const result = await client.inboxes.drafts.send(inboxId, draftId, {});

  // Send only returns messageId and threadId, build minimal message object
  return {
    message_id: result.messageId,
    thread_id: result.threadId,
    inbox_id: inboxId,
    subject: '',
    from: inboxId,
    to: [],
    cc: undefined,
    bcc: undefined,
    text: '',
    html: undefined,
    labels: [],
    created_at: new Date().toISOString(),
  };
}

/**
 * Delete a draft
 * @param inboxId Inbox ID
 * @param draftId Draft ID
 */
export async function deleteDraft(
  inboxId: string,
  draftId: string,
): Promise<void> {
  const client = getClient();
  await client.inboxes.drafts.delete(inboxId, draftId);
}
