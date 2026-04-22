import { Handler } from '@netlify/functions';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL;

export const handler: Handler = async (event, context) => {
  const code = event.queryStringParameters?.code;
  
  if (!code) {
    return { statusCode: 400, body: 'No code provided' };
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/auth-callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
              .card { background: white; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
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
      `,
    };
  } catch (error) {
    console.error('Error exchanging code:', error);
    return { statusCode: 500, body: 'Authentication failed' };
  }
};
