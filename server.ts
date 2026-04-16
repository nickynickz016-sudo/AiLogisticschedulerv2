import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${APP_URL}/api/auth/google/callback`
);

// API Routes
app.get('/api/auth/google/url', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured' });
  }
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // Send tokens back to the client via postMessage
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 2rem; rounded: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h1 { color: #1e293b; margin-bottom: 1rem; }
            p { color: #64748b; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Success!</h1>
            <p>Google Calendar has been connected. This window will close automatically.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code:', error);
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/calendar/sync', async (req, res) => {
  const { survey, tokens } = req.body;
  
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated with Google' });
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const startDateTime = `${survey.survey_date}T${survey.start_time || '09:00'}:00`;
    const endDateTime = `${survey.survey_date}T${survey.end_time || '10:00'}:00`;

    const event = {
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
        requestBody: event,
        sendUpdates: 'all', // Send notifications to guests
      });
    } else {
      response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all', // Send notifications to guests
      });
    }

    res.json({ success: true, eventId: response.data.id });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to sync with Google Calendar' });
  }
});

app.post('/api/calendar/delete', async (req, res) => {
  const { eventId, tokens } = req.body;
  
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated with Google' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'No event ID provided' });
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    res.json({ success: true });
  } catch (error: any) {
    // If event already deleted, consider it success
    if (error.code === 410 || error.code === 404) {
      return res.json({ success: true });
    }
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete Google Calendar event' });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
