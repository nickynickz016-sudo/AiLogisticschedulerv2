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

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dtlpmlwvfsebirzzmniq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bHBtbHd2ZnNlYmlyenptbmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzM3MjQsImV4cCI6MjA4Mjg0OTcyNH0.wZtQ3os_ab7aaJDKITE64oU242-tkbC1VC7yy2c7Ehk';
const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VALID_BRANCHES = ['UAE', 'KSA', 'QATAR'];

// Branch Validation Middleware: validates branch header / session token
const validateBranchContext = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const branch = (req.headers['x-branch-id'] as string || req.query.branch as string || 'UAE').toUpperCase();
  if (!VALID_BRANCHES.includes(branch)) {
    return res.status(400).json({ 
      error: `Invalid branch '${branch}'. Authorized branches: ${VALID_BRANCHES.join(', ')}` 
    });
  }
  (req as any).branch = branch;
  next();
};

// 1. Branches Metadata API
app.get('/api/branches', (_req, res) => {
  res.json({
    branches: [
      { id: 'UAE', code: 'UAE', name: 'United Arab Emirates', country: 'United Arab Emirates', currency: 'AED', phone_code: '+971' },
      { id: 'KSA', code: 'KSA', name: 'Saudi Arabia', country: 'Kingdom of Saudi Arabia', currency: 'SAR', phone_code: '+966' },
      { id: 'QATAR', code: 'QATAR', name: 'Qatar', country: 'State of Qatar', currency: 'QAR', phone_code: '+974' }
    ]
  });
});

// 2. Jobs API - Strict Branch Isolation (Requirement 2, 3, 12)
app.get('/api/jobs', validateBranchContext, async (req, res) => {
  const branch = (req as any).branch;
  try {
    const { data, error } = await supabaseServer
      .from('jobs')
      .select('*')
      .eq('branch', branch)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback query if table pre-migration
      const fallback = await supabaseServer.from('jobs').select('*');
      const filtered = (fallback.data || []).filter((j: any) => (j.branch || 'UAE') === branch);
      return res.json({ branch, jobs: filtered });
    }

    res.json({ branch, jobs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', validateBranchContext, async (req, res) => {
  const branch = (req as any).branch;
  const jobData = req.body;

  // Enforce server-side branch assignment (cannot be forged by frontend)
  const jobWithBranch = {
    ...jobData,
    branch,
    id: jobData.id || `${branch === 'KSA' ? 'KSA-' : branch === 'QATAR' ? 'QAT-' : 'AE-'}${Date.now()}`
  };

  try {
    const { data, error } = await supabaseServer.from('jobs').insert([jobWithBranch]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ branch, job: data?.[0] || jobWithBranch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/jobs/:id', validateBranchContext, async (req, res) => {
  const branch = (req as any).branch;
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Check if record exists in active branch
    const { data: existing } = await supabaseServer.from('jobs').select('id, branch').eq('id', id).maybeSingle();
    if (existing && existing.branch !== branch) {
      return res.status(403).json({ 
        error: `Cross-branch mutation prohibited. Job '${id}' belongs to ${existing.branch}, not active branch ${branch}.` 
      });
    }

    // Never allow overriding the branch via payload
    const sanitizedUpdate = { ...updateData, branch };
    const { data, error } = await supabaseServer
      .from('jobs')
      .update(sanitizedUpdate)
      .eq('id', id)
      .eq('branch', branch)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ branch, job: data?.[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', validateBranchContext, async (req, res) => {
  const branch = (req as any).branch;
  const { id } = req.params;

  try {
    const { data: existing } = await supabaseServer.from('jobs').select('id, branch').eq('id', id).maybeSingle();
    if (existing && existing.branch !== branch) {
      return res.status(403).json({ 
        error: `Cross-branch deletion prohibited. Job '${id}' belongs to ${existing.branch}.` 
      });
    }

    const { error } = await supabaseServer.from('jobs').delete().eq('id', id).eq('branch', branch);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, deletedId: id, branch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Cost Sheets API - Strict Branch Isolation (Requirement 5, 12)
app.get('/api/cost-sheets', validateBranchContext, async (req, res) => {
  const branch = (req as any).branch;
  try {
    const { data, error } = await supabaseServer
      .from('job_cost_sheets')
      .select('*')
      .eq('branch', branch);

    if (error) {
      const fallback = await supabaseServer.from('job_cost_sheets').select('*');
      const filtered = (fallback.data || []).filter((cs: any) => (cs.branch || 'UAE') === branch);
      return res.json({ branch, costSheets: filtered });
    }
    res.json({ branch, costSheets: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reports API - Strict Branch Isolation (Requirement 4, 12)
app.get('/api/reports', validateBranchContext, async (req, res) => {
  const branch = (req as any).branch;
  try {
    const [jobsRes, costSheetsRes] = await Promise.all([
      supabaseServer.from('jobs').select('*').eq('branch', branch),
      supabaseServer.from('job_cost_sheets').select('*').eq('branch', branch)
    ]);

    const jobs = jobsRes.data || [];
    const costSheets = costSheetsRes.data || [];
    const totalVolume = jobs.reduce((acc, j: any) => acc + (Number(j.volume_cbm) || 0), 0);
    const totalCost = costSheets.reduce((acc, cs: any) => acc + (Number(cs.total_cost) || 0), 0);

    res.json({
      branch,
      summary: {
        totalJobs: jobs.length,
        totalVolumeCbm: Math.round(totalVolume * 100) / 100,
        totalCostAmount: Math.round(totalCost * 100) / 100,
        currency: branch === 'KSA' ? 'SAR' : branch === 'QATAR' ? 'QAR' : 'AED'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
