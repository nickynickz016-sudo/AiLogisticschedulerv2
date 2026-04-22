import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL; // Should be set to your Netlify URL in Netlify dashboard

export const handler: Handler = async (event, context) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Google OAuth credentials not configured' }),
    };
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/auth-callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent'
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url }),
  };
};
