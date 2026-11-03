const express = require('express');
const path = require('node:path');
const os = require('node:os');
const QRCode = require('qrcode');
const { simpleParser } = require('mailparser');
const tunnel = require('./src/tunnel');
const db = require('./src/database');
const { generateUSIdentity } = require('./src/generator');
const { extractVerificationCode } = require('./src/otp-extractor');
const { startSMTPServer } = require('./src/smtp-server');
const cloudMail = require('./src/cloud-mail');
const { getCloudflareWorkerScript } = require('./src/cloudflare-worker-template');

const app = express();
const PORT = process.env.PORT || 3000;
const SMTP_PORT = process.env.SMTP_PORT || 2525;

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Server-Sent Events (SSE) clients for real-time inbox updates
const sseClients = new Set();

function broadcastNewEmail(data) {
  for (const client of sseClients) {
    client.write(`event: new-email\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

// Detect physical LAN IP (ignoring VPN and virtual interfaces)
function getLocalNetworkIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const lower = name.toLowerCase();
        if (!lower.includes('vpn') && !lower.includes('virtual') && !lower.includes('wsl')) {
          return iface.address;
        }
      }
    }
  }
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Network and QR Code endpoints
app.get('/api/network-info', (req, res) => {
  const lanIp = getLocalNetworkIp();
  const publicUrl = tunnel.getPublicUrl();
  res.json({
    success: true,
    publicUrl: publicUrl || null,
    lanIp,
    port: PORT,
    lanBaseUrl: `http://${lanIp}:${PORT}`
  });
});

app.get('/api/qrcode', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).json({ success: false, error: 'Texto não fornecido' });
  try {
    const qr = await QRCode.toDataURL(text, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    res.json({ success: true, qr });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 1. Generate Realistic US Email & Identity
app.get('/api/generate', (req, res) => {
  const domain = req.query.domain || 'sapokas.com';
  const identity = generateUSIdentity(domain);
  res.json({ success: true, identity });
});

// Permanent Inboxes API
app.get('/api/inboxes', (req, res) => {
  const inboxes = db.getAllInboxes();
  res.json({ success: true, inboxes });
});

app.get('/api/inboxes/:query', (req, res) => {
  const inbox = db.getInbox(req.params.query);
  if (!inbox) {
    return res.status(404).json({ success: false, error: 'Caixa de e-mail não encontrada' });
  }

  // Activate cloud polling for this specific inbox if it is an inboxkitten or web inbox
  if (inbox.domain.includes('inboxkitten')) {
    cloudMail.activateInbox(inbox.username, inbox.address);
  }

  res.json({ success: true, inbox });
});

app.post('/api/inboxes', (req, res) => {
  const { address, username, domain, fullName, location, phone, accessKey } = req.body;
  if (!address) {
    return res.status(400).json({ success: false, error: 'Endereço obrigatório' });
  }

  const saved = db.saveInbox({
    address,
    username: username || address.split('@')[0],
    domain: domain || address.split('@')[1] || 'inboxkitten.com',
    fullName,
    location,
    phone,
    accessKey
  });

  res.json({ success: true, inbox: saved });
});

// Pretty direct URL routes for permanent inbox links
app.get('/inbox/:key', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/view/:key', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. List Emails (with optional recipient filter)
app.get('/api/emails', (req, res) => {
  const { recipient } = req.query;
  const emails = db.getAllEmails(recipient);
  res.json({ success: true, emails });
});

// 3. Get Single Email
app.get('/api/emails/:id', (req, res) => {
  const email = db.getEmailById(req.params.id);
  if (!email) {
    return res.status(404).json({ success: false, error: 'E-mail não encontrado' });
  }
  res.json({ success: true, email });
});

// 4. Delete Single Email
app.delete('/api/emails/:id', (req, res) => {
  db.deleteEmail(req.params.id);
  res.json({ success: true, message: 'E-mail excluído com sucesso' });
});

// 5. Clear All Emails
app.delete('/api/emails', (req, res) => {
  db.clearAll();
  res.json({ success: true, message: 'Todos os e-mails foram limpos' });
});

// 6. Stats
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

// 7. Webhook for Incoming Emails (Cloudflare Worker, Mailgun, SendGrid, etc.)
app.post('/api/webhook/email', async (req, res) => {
  try {
    const { to, from, subject, bodyText, bodyHtml, raw } = req.body;

    let finalRecipient = to;
    let finalSender = from;
    let finalSubject = subject;
    let finalText = bodyText || '';
    let finalHtml = bodyHtml || '';
    let rawHeaders = {};

    // If raw MIME is sent (e.g. from Cloudflare Worker)
    if (raw) {
      const parsed = await simpleParser(raw);
      finalRecipient = finalRecipient || (parsed.to && parsed.to.text);
      finalSender = finalSender || (parsed.from && parsed.from.text);
      finalSubject = finalSubject || parsed.subject;
      finalText = parsed.text || finalText;
      finalHtml = parsed.html || parsed.textAsHtml || finalHtml || finalText;
      rawHeaders = Object.fromEntries(parsed.headers);
    }

    if (!finalRecipient) {
      finalRecipient = 'catchall@sapokas.com';
    }

    const code = extractVerificationCode(finalSubject, finalText || finalHtml);

    const saved = db.saveEmail({
      recipient: finalRecipient,
      sender: finalSender || 'Unknown',
      subject: finalSubject || '(Sem Assunto)',
      bodyText: finalText,
      bodyHtml: finalHtml,
      verificationCode: code,
      rawHeaders,
      receivedAt: new Date().toISOString()
    });

    broadcastNewEmail({
      id: saved.id,
      recipient: finalRecipient,
      sender: finalSender,
      subject: finalSubject,
      code
    });

    console.log(`[Webhook] E-mail recebido para <${finalRecipient}>! Assunto: "${finalSubject}" | Código: ${code || 'N/A'}`);
    res.json({ success: true, message: 'E-mail recebido e processado com sucesso', id: saved.id, code });
  } catch (err) {
    console.error('[Webhook] Erro ao processar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Simulate Incoming Verification Email (for testing)
app.post('/api/simulate', (req, res) => {
  const { recipient, service } = req.body;
  const targetEmail = recipient || 'john.miller.us92@sapokas.com';

  const mockServices = [
    {
      name: 'Steam Support',
      from: 'Steam Support <noreply@steampowered.com>',
      subjectGenerator: (c) => `Your Steam account: Verification code`,
      bodyGenerator: (c) => `Hello!\n\nHere is the Steam Guard code you need to log in to your account:\n\n${c}\n\nIf you did not attempt to log in, please secure your account immediately.\n\nThe Steam Team`,
      htmlGenerator: (c) => `<div style="font-family:Arial,sans-serif;background:#171a21;color:#c6d4df;padding:24px;border-radius:8px;">
        <h2 style="color:#66c0f4;">Steam Guard</h2>
        <p>Dear user,</p>
        <p>Here is your Steam verification code:</p>
        <div style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#ffffff;background:#212b3b;padding:16px;border-radius:6px;display:inline-block;">${c}</div>
        <p style="margin-top:20px;font-size:12px;color:#8f98a0;">Steam Support will never ask for your password or code.</p>
      </div>`
    },
    {
      name: 'Discord',
      from: 'Discord <noreply@discord.com>',
      subjectGenerator: (c) => `Seu código de verificação do Discord é ${c}`,
      bodyGenerator: (c) => `Olá!\n\nUse o código abaixo para confirmar sua conta:\n\nCódigo de verificação: ${c}\n\nEste código expira em 10 minutos.`,
      htmlGenerator: (c) => `<div style="font-family:'Segoe UI',sans-serif;background:#313338;color:#dbdee1;padding:24px;border-radius:8px;">
        <h2 style="color:#5865f2;">Discord Security</h2>
        <p>Use o código de confirmação abaixo:</p>
        <div style="font-size:32px;font-weight:bold;color:#5865f2;background:#2b2d31;padding:14px 20px;border-radius:8px;display:inline-block;">${c}</div>
        <p style="margin-top:16px;font-size:13px;color:#949ba4;">Não compartilhe esse código com ninguém.</p>
      </div>`
    },
    {
      name: 'Google Verification',
      from: 'Google <no-reply@accounts.google.com>',
      subjectGenerator: (c) => `G-${c} é seu código de verificação do Google`,
      bodyGenerator: (c) => `G-${c} é o seu código de verificação do Google.\nNão compartilhe este código com ninguém.`,
      htmlGenerator: (c) => `<div style="font-family:'Google Sans',Roboto,sans-serif;padding:24px;border:1px solid #dadce0;border-radius:8px;max-width:500px;">
        <h3 style="color:#202124;">Código de verificação do Google</h3>
        <p>Use o código a seguir para confirmar seu login:</p>
        <div style="font-size:28px;font-weight:bold;color:#1a73e8;letter-spacing:2px;margin:18px 0;">G-${c}</div>
        <p style="font-size:12px;color:#5f6368;">Se você não solicitou este código, ignore esta mensagem.</p>
      </div>`
    },
    {
      name: 'Netflix',
      from: 'Netflix <info@mailer.netflix.com>',
      subjectGenerator: (c) => `Código de acesso temporário da Netflix: ${c}`,
      bodyGenerator: (c) => `Seu código de acesso único é ${c}.\n\nVálido por 15 minutos.`,
      htmlGenerator: (c) => `<div style="font-family:Helvetica,Arial,sans-serif;background:#000000;color:#ffffff;padding:28px;border-radius:8px;">
        <h1 style="color:#e50914;margin:0 0 16px 0;">NETFLIX</h1>
        <p style="font-size:16px;">Seu código de confirmação é:</p>
        <div style="font-size:36px;font-weight:bold;color:#ffffff;letter-spacing:6px;margin:20px 0;">${c}</div>
        <p style="font-size:12px;color:#808080;">Equipe Netflix</p>
      </div>`
    }
  ];

  let selected = mockServices[Math.floor(Math.random() * mockServices.length)];
  if (service) {
    const found = mockServices.find(s => s.name.toLowerCase().includes(service.toLowerCase()));
    if (found) selected = found;
  }

  const randomOtp = String(Math.floor(Math.random() * 900000 + 100000));
  const subject = selected.subjectGenerator(randomOtp);
  const bodyText = selected.bodyGenerator(randomOtp);
  const bodyHtml = selected.htmlGenerator(randomOtp);
  const code = extractVerificationCode(subject, bodyText);

  const saved = db.saveEmail({
    recipient: targetEmail,
    sender: selected.from,
    subject,
    bodyText,
    bodyHtml,
    verificationCode: code,
    rawHeaders: { 'x-simulated': 'true' },
    receivedAt: new Date().toISOString()
  });

  broadcastNewEmail({
    id: saved.id,
    recipient: targetEmail,
    sender: selected.from,
    subject,
    code
  });

  res.json({
    success: true,
    message: `E-mail de simulação (${selected.name}) enviado com sucesso!`,
    emailId: saved.id,
    code
  });
});

// 9. Instant Cloud Mailbox (Mail.tm integration for live internet reception)
app.post('/api/cloud/inbox', async (req, res) => {
  const { username } = req.body;
  const result = await cloudMail.createCloudInbox(username);
  res.json(result);
});

// 10. Cloudflare Worker Script Helper
app.get('/api/cloudflare-script', (req, res) => {
  const host = req.get('host') || 'SEU_DOMINIO_OU_NGROK.com';
  const protocol = req.protocol || 'http';
  const webhookUrl = `${protocol}://${host}/api/webhook/email`;
  res.json({
    success: true,
    script: getCloudflareWorkerScript(webhookUrl),
    instructions: {
      step1: 'Acesse o painel do Cloudflare do seu domínio sapokas.com',
      step2: 'Vá em Email Routing (Roteamento de E-mail) -> Routing Rules',
      step3: 'Crie uma regra "Catch-all" (qualquer endereço *@sapokas.com)',
      step4: 'Defina a ação para "Send to a Worker" e cole este script!'
    }
  });
});

// Start embedded SMTP Server
try {
  startSMTPServer(SMTP_PORT, (data) => {
    broadcastNewEmail(data);
  });
} catch (smtpErr) {
  console.warn(`[SMTP Aviso] Não foi possível iniciar SMTP na porta ${SMTP_PORT}: ${smtpErr.message}`);
}

// Wire CloudMail to broadcast SSE
cloudMail.setOnNewMessageCallback((data) => {
  broadcastNewEmail(data);
});

// Start HTTP Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  SISTEMA DE E-MAILS AMERICANOS (@sapokas.com) ATIVO!  `);
  console.log(`  Painel Local: http://localhost:${PORT}                 `);
  console.log(`  SMTP Server:  0.0.0.0:${SMTP_PORT}                     `);
  console.log(`=======================================================`);

  // Start Global Public Tunnel for 4G/5G/Mobile access
  tunnel.startTunnel(PORT);
});
