const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { google } = require('googleapis');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();

// CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5001/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const userSessions = new Map();

console.log('\n🔧 Server Configuration:');
console.log('   CLIENT_ID:', CLIENT_ID ? '✅' : '❌');
console.log('   CLIENT_SECRET:', CLIENT_SECRET ? '✅' : '❌');

function cleanupOldSessions() {
  const now = Date.now();
  for (const [sessionId, session] of userSessions.entries()) {
    if (now - session.createdAt > 24 * 60 * 60 * 1000) {
      userSessions.delete(sessionId);
    }
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server running', port: 5001 });
});

// OAuth
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('http://localhost:3000?error=no_code');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const sessionId = require('crypto').randomBytes(32).toString('hex');
    userSessions.set(sessionId, {
      tokens,
      userInfo: userInfo.data,
      createdAt: Date.now()
    });

    console.log('✅ User:', userInfo.data.email);
    cleanupOldSessions();
    
    res.redirect(`http://localhost:3000/dashboard?session=${sessionId}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect('http://localhost:3000?error=auth_failed');
  }
});

// Fetch emails
app.post('/api/emails', async (req, res) => {
  try {
    const { sessionId, maxResults = 50 } = req.body;
    
    if (!userSessions.has(sessionId)) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    const userSession = userSessions.get(sessionId);
    oauth2Client.setCredentials(userSession.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    console.log(`\n📧 Fetching ${maxResults} emails...`);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: parseInt(maxResults),
      q: 'in:inbox'
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const msg of messages) {
      try {
        const data = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = data.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        let body = '';
        let htmlBody = '';
        
        const extractBody = (part) => {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf8');
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = Buffer.from(part.body.data, 'base64').toString('utf8');
          }
          if (part.parts) part.parts.forEach(extractBody);
        };

        extractBody(data.data.payload);

        emails.push({
          id: data.data.id,
          subject,
          from,
          date,
          snippet: data.data.snippet,
          body: htmlBody || body,
          isHtml: !!htmlBody
        });
      } catch (err) {
        console.error('Error fetching email:', err.message);
      }
    }

    console.log(`✅ Fetched ${emails.length} emails\n`);
    res.json({ success: true, emails });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch emails' });
  }
});

// UPDATED CLASSIFICATION ENDPOINT WITH SPECIFIC REQUIREMENTS
app.post('/api/classify', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 CLASSIFICATION REQUEST');
  console.log('='.repeat(60));
  
  try {
    const { emails, openaiApiKey, categoryDefinitions } = req.body;
    
    console.log('Request received:');
    console.log('  - Emails:', emails?.length || 0);
    console.log('  - API Key:', openaiApiKey ? openaiApiKey.substring(0, 20) + '...' : 'MISSING');
    
    // Validate inputs
    if (!openaiApiKey) {
      console.log('❌ No API key provided\n');
      return res.status(400).json({ 
        success: false, 
        error: 'OpenAI API key is required' 
      });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      console.log('❌ No emails provided\n');
      return res.status(400).json({ 
        success: false, 
        error: 'No emails provided' 
      });
    }

    // Initialize OpenAI
    let openai;
    try {
      openai = new OpenAI({ apiKey: openaiApiKey.trim() });
      
      // Test API key
      console.log('Testing OpenAI connection...');
      await openai.models.list();
      console.log('✅ OpenAI API key valid\n');
    } catch (testError) {
      console.error('❌ API Key Invalid:', testError.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid OpenAI API key. Please check your key.' 
      });
    }

    // Updated system prompt with specific requirements
    const systemPrompt = `You are an email classifier. Classify emails into EXACTLY ONE of these categories:

**Important**: Emails that are personal or work-related and require immediate attention like class, placement drive, message from internshala or any other important requirement. This includes urgent college notifications, placement opportunities, important internshala messages.

**Promotions**: Emails related to sales, discounts, and marketing campaigns. Direct product sales and discount offers.

**Social**: Emails from social networks (Facebook, Instagram, Twitter, LinkedIn social notifications), friends, and family.

**Marketing**: Emails related to marketing, newsletters, and notifications from LinkedIn (job posts), Internshala job opportunities, Zomato, Swiggy, food delivery services, and similar platforms.

**Spam**: Unwanted or unsolicited emails, suspicious senders, phishing attempts.

**General**: If none of the above are matched, use General.

CRITICAL RULES:
- Internshala placement/class/important alerts → Important
- Internshala job opportunities/newsletters → Marketing  
- LinkedIn job postings → Marketing
- LinkedIn connection requests → Social
- Food delivery (Zomato, Swiggy) → Marketing
- Direct sales/discounts → Promotions
- College/University important notices → Important
- Placement drives → Important
- Unknown/suspicious → Spam

Respond with ONLY ONE WORD: the category name (Important, Promotions, Social, Marketing, Spam, or General).`;

    const classifications = [];

    // Classify each email individually for better accuracy
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        console.log(`[${i + 1}/${emails.length}] ${email.subject?.substring(0, 50)}...`);
        
        const emailContent = `From: ${email.from || 'Unknown'}
Subject: ${email.subject || 'No Subject'}
Preview: ${(email.snippet || email.body || '').substring(0, 500)}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Using gpt-4o-mini for better accuracy
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Classify this email:\n\n${emailContent}`
            }
          ],
          max_tokens: 20,
          temperature: 0.2
        });

        let category = completion.choices[0].message.content.trim();
        
        // Clean up the response
        category = category.replace(/[^a-zA-Z]/g, '');
        
        // Map variations to standard categories
        const categoryMap = {
          'important': 'Important',
          'promotions': 'Promotions',
          'promotional': 'Promotions',
          'promotion': 'Promotions',
          'social': 'Social',
          'marketing': 'Marketing',
          'spam': 'Spam',
          'general': 'General',
          'junk': 'Spam',
          'newsletter': 'Marketing'
        };
        
        category = categoryMap[category.toLowerCase()] || 'General';
        
        console.log(`  → ${category}`);
        
        classifications.push({
          ...email,
          category
        });
        
        // Rate limiting: 400ms between requests
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        
      } catch (emailError) {
        console.error(`  ✗ Error: ${emailError.message}`);
        
        // Smart fallback classification based on keywords
        const text = ((email.subject || '') + ' ' + (email.from || '') + ' ' + (email.snippet || '')).toLowerCase();
        let fallback = 'General';
        
        // Check for Important keywords
        if (text.match(/\b(class|placement|college|university|exam|assignment|internshala.*important|urgent|action required)\b/)) {
          fallback = 'Important';
        }
        // Check for Marketing keywords
        else if (text.match(/\b(zomato|swiggy|linkedin.*job|internshala.*job|newsletter|subscription)\b/)) {
          fallback = 'Marketing';
        }
        // Check for Promotions keywords
        else if (text.match(/\b(sale|discount|offer|deal|coupon|save|off|promo)\b/)) {
          fallback = 'Promotions';
        }
        // Check for Social keywords
        else if (text.match(/\b(facebook|instagram|twitter|linkedin.*connect|friend|tagged|mentioned)\b/)) {
          fallback = 'Social';
        }
        // Check for Spam keywords
        else if (text.match(/\b(spam|phishing|suspicious|verify your account|click here now|congratulations you won)\b/)) {
          fallback = 'Spam';
        }
        
        console.log(`  → ${fallback} (fallback)`);
        
        classifications.push({
          ...email,
          category: fallback
        });
      }
    }

    // Calculate statistics
    const stats = classifications.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {});

    console.log('\n✅ Classification Complete!');
    console.log('📊 Results:', stats);
    console.log('='.repeat(60) + '\n');
    
    res.json({ 
      success: true, 
      classifications,
      stats: {
        total: classifications.length,
        byCategory: stats
      }
    });
    
  } catch (error) {
    console.error('\n❌ CLASSIFICATION ERROR:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    
    res.status(500).json({ 
      success: false, 
      error: 'Classification failed: ' + error.message
    });
  }
});

// Check session
app.get('/api/session/:sessionId', (req, res) => {
  const session = userSessions.get(req.params.sessionId);
  if (session) {
    res.json({ success: true, valid: true, user: session.userInfo });
  } else {
    res.json({ success: true, valid: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) userSessions.delete(sessionId);
  res.json({ success: true });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log('\n🚀 Email Classifier Backend');
  console.log('================================');
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log('================================\n');
});