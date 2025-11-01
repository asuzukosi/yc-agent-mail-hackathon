/**
 * API Request Logger Utility
 * Provides detailed logging for debugging API endpoints
 */

interface LogContext {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  userId?: string;
  requestId?: string;
}

interface LogMetadata {
  timestamp?: string;
  duration?: number;
  status?: number;
  error?: Error | string;
  [key: string]: any;
}

/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(data: any, depth = 0): any {
  if (depth > 10) return '[MAX DEPTH]'; // Prevent infinite recursion
  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Truncate long strings
    if (data.length > 500) {
      return data.substring(0, 500) + '... [TRUNCATED]';
    }
    return data;
  }
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.slice(0, 10).map((item) => sanitizeData(item, depth + 1));
  }
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'api_key', 'apikey'];
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = sanitizeData(value, depth + 1);
    }
  }
  
  return sanitized;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log API request start
 */
export function logRequestStart(context: LogContext): string {
  const requestId = context.requestId || generateRequestId();
  const timestamp = new Date().toISOString();
  
  console.log('\n' + '='.repeat(80));
  console.log(`[${timestamp}] 📥 REQUEST START [${requestId}]`);
  console.log(`Method: ${context.method}`);
  console.log(`Path: ${context.path}`);
  
  if (context.query && Object.keys(context.query).length > 0) {
    console.log(`Query:`, sanitizeData(context.query));
  }
  
  if (context.headers) {
    const sanitizedHeaders = sanitizeData(context.headers);
    console.log(`Headers:`, sanitizedHeaders);
  }
  
  if (context.body) {
    const sanitizedBody = sanitizeData(context.body);
    console.log(`Body:`, JSON.stringify(sanitizedBody, null, 2));
  }
  
  if (context.userId) {
    console.log(`User ID: ${context.userId}`);
  }
  
  console.log('='.repeat(80) + '\n');
  
  return requestId;
}

/**
 * Log API request success
 */
export function logRequestSuccess(
  requestId: string,
  status: number,
  response?: any,
  metadata?: LogMetadata
): void {
  const timestamp = new Date().toISOString();
  const duration = metadata?.duration;
  
  console.log('\n' + '='.repeat(80));
  console.log(`[${timestamp}] ✅ REQUEST SUCCESS [${requestId}]`);
  console.log(`Status: ${status}`);
  
  if (duration !== undefined) {
    console.log(`Duration: ${duration}ms`);
  }
  
  if (response) {
    const sanitizedResponse = sanitizeData(response);
    console.log(`Response:`, JSON.stringify(sanitizedResponse, null, 2));
  }
  
  if (metadata) {
    const { duration: _, status: __, error: ___, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      console.log(`Metadata:`, rest);
    }
  }
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Log API request error
 */
export function logRequestError(
  requestId: string,
  error: Error | string,
  status?: number,
  metadata?: LogMetadata
): void {
  const timestamp = new Date().toISOString();
  const duration = metadata?.duration;
  
  console.error('\n' + '='.repeat(80));
  console.error(`[${timestamp}] ❌ REQUEST ERROR [${requestId}]`);
  
  if (status) {
    console.error(`Status: ${status}`);
  }
  
  if (duration !== undefined) {
    console.error(`Duration: ${duration}ms`);
  }
  
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    console.error(`Stack:`, error.stack);
  } else {
    console.error(`Error: ${error}`);
  }
  
  if (metadata) {
    const { duration: _, status: __, error: ___, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      console.error(`Metadata:`, rest);
    }
  }
  
  console.error('='.repeat(80) + '\n');
}

/**
 * Log API request with timing
 */
export function logRequest(
  requestId: string,
  method: string,
  path: string,
  startTime: number,
  status?: number,
  error?: Error | string,
  response?: any
): void {
  const duration = Date.now() - startTime;
  
  if (error) {
    logRequestError(requestId, error, status, { duration });
  } else {
    logRequestSuccess(requestId, status || 200, response, { duration });
  }
}

/**
 * Helper to extract request context from Next.js Request
 */
export function extractRequestContext(
  request: Request,
  body?: any,
  searchParams?: URLSearchParams
): LogContext {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const query: Record<string, string> = {};
  if (searchParams) {
    searchParams.forEach((value, key) => {
      query[key] = value;
    });
  }
  
  return {
    method: request.method,
    path: url.pathname,
    headers,
    body,
    query: Object.keys(query).length > 0 ? query : undefined,
  };
}

