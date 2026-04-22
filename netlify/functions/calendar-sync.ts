import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { survey, tokens } = JSON.parse(event.body || '{}');

  if (!tokens) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated with Google' }) };
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const startDateTime = `${survey.survey_date}T${survey.start_time || '09:00'}:00`;
    const endDateTime = `${survey.survey_date}T${survey.end_time || '10:00'}:00`;

    const calendarEvent = {
      summary: `Survey: ${survey.shipper_name} (${survey.enquiry_number})`,
      location: survey.location,
      description: `Survey Type: ${survey.survey_type}\nMode: ${survey.mode}\nStatus: ${survey.status}\nSurveyor: ${survey.surveyor_name}`,
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Dubai',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Dubai',
      },
      attendees: survey.client_emails ? survey.client_emails.map((email: string) => ({ email })) : [],
    };

    let response;
    if (survey.google_event_id) {
      response = await calendar.events.update({
        calendarId: 'primary',
        eventId: survey.google_event_id,
        requestBody: calendarEvent,
        sendUpdates: 'all',
      });
    } else {
      response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
        sendUpdates: 'all',
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, eventId: response.data.id }),
    };
  } catch (error: any) {
    console.error('Error syncing with Google Calendar:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to sync with Google Calendar' }),
    };
  }
};
