import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { eventId, tokens } = JSON.parse(event.body || '{}');

  if (!tokens) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated with Google' }) };
  }

  if (!eventId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No event ID provided' }) };
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    if (error.code === 410 || error.code === 404) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }
    console.error('Error deleting calendar event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete Google Calendar event' }),
    };
  }
};
