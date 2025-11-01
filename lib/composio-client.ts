import { Composio } from '@composio/core';

/**
 * Initialize Composio client
 */
function getComposioClient(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY;
  
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not set in environment variables');
  }

  return new Composio({
    apiKey,
  });
}

/**
 * Schedule a Google Calendar meeting for a candidate
 * @param candidateEmail - Candidate's email address
 * @param candidateName - Candidate's name
 * @param startTime - ISO 8601 datetime string for meeting start
 * @param durationMinutes - Duration of meeting in minutes (default: 30)
 * @param title - Meeting title (default: "Recruitment Meeting")
 * @param description - Meeting description
 */
export async function scheduleGoogleCalendarMeeting(params: {
  candidateEmail: string;
  candidateName: string;
  startTime: string; // ISO 8601 format
  durationMinutes?: number;
  title?: string;
  description?: string;
}): Promise<{
  success: boolean;
  eventId?: string;
  meetingLink?: string;
  error?: string;
}> {
  try {
    const composio = getComposioClient();
    
    // Get the authenticated entity (user already authenticated Google Calendar on dashboard)
    // If entity ID is provided via env var, use it; otherwise get default entity
    const entityId = process.env.COMPOSIO_ENTITY_ID;
    let entity;
    
    if (entityId) {
      entity = await composio.entities.get(entityId);
    } else {
      // Get the default entity (first available)
      const entities = await composio.entities.list();
      if (entities.length === 0) {
        throw new Error('No authenticated entity found. Please authenticate Google Calendar on Composio dashboard first.');
      }
      entity = entities[0];
    }
    
    // Get Google Calendar app
    const googleCalendar = await composio.getApp('GOOGLECALENDAR');
    
    // Calculate end time
    const durationMinutes = params.durationMinutes || 30;
    const startDate = new Date(params.startTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create calendar event using Composio tools.execute
    const result = await composio.tools.execute({
      app: 'GOOGLECALENDAR',
      action: 'CREATE_EVENT',
      parameters: {
        summary: params.title || `Final Interview - ${params.candidateName}`,
        description: params.description || `Final stage interview meeting with ${params.candidateName}`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: timeZone,
        },
        attendees: [
          {
            email: params.candidateEmail,
          },
        ],
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      },
      entityId: entity.id,
    });

    // Extract event details from result
    const event = result.data || result;
    
    return {
      success: true,
      eventId: event.id,
      meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || event.htmlLink,
    };
  } catch (error) {
    console.error('Error scheduling Google Calendar meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error scheduling meeting',
    };
  }
}

/**
 * Find available time slots for scheduling a meeting
 * This is a helper function that can be used to suggest meeting times
 */
export async function findAvailableTimeSlots(params: {
  candidateEmail: string;
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  durationMinutes?: number;
}): Promise<{
  success: boolean;
  availableSlots?: Array<{ start: string; end: string }>;
  error?: string;
}> {
  try {
    const composio = getComposioClient();
    const googleCalendar = await composio.getApp('GOOGLECALENDAR');
    const entity = await composio.getEntity();

    // Get busy times from calendar
    const busyTimes = await googleCalendar.executeAction({
      action: 'QUERY_FREEBUSY',
      parameters: {
        timeMin: params.startDate,
        timeMax: params.endDate,
        items: [
          {
            id: 'primary',
          },
        ],
      },
      entityId: entity.id,
    });

    // This is a simplified version - in production, you'd want more sophisticated logic
    // to find gaps in the busy times
    return {
      success: true,
      availableSlots: [], // Placeholder - implement gap finding logic if needed
    };
  } catch (error) {
    console.error('Error finding available time slots:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error finding time slots',
    };
  }
}

