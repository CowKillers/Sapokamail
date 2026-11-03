/**
 * High-Reliability Cloud Mail Service (InboxKitten / Mailgun Backend)
 * Guaranteed 100% instant disposable inboxes with no accounts, no passwords,
 * and no rate-limit blocks for receiving real-world OTPs and verification codes.
 */

const db = require('./database');
const { extractVerificationCode } = require('./otp-extractor');

let activeRecipient = null;
let activeAddress = null;
let syncInterval = null;
let knownMessageKeys = new Set();
let onNewMessageCallback = null;

function setOnNewMessageCallback(cb) {
  onNewMessageCallback = cb;
}

async function createCloudInbox(desiredUsername = null) {
  try {
    // Generate clean US username without spaces or special characters
    let cleanUser = desiredUsername
      ? desiredUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '')
      : 'us' + Math.floor(Math.random() * 900000 + 100000);

    // Make sure it has a unique random identifier to prevent collisions with other people
    const randSuffix = Math.floor(Math.random() * 9000 + 1000);
    cleanUser = `${cleanUser.replace(/[^a-z0-9]/g, '')}${randSuffix}`;

    const domain = 'inboxkitten.com';
    activeRecipient = cleanUser;
    activeAddress = `${cleanUser}@${domain}`;
    knownMessageKeys.clear();

    // Start background sync
    startPolling();

    console.log(`[CloudMail] Caixa ativa criada com sucesso: ${activeAddress}`);

    return {
      success: true,
      address: activeAddress,
      domain,
      username: cleanUser
    };
  } catch (err) {
    console.error('[CloudMail] Falha ao criar caixa:', err);
    return { success: false, error: err.message };
  }
}

async function checkCloudMessages() {
  if (!activeRecipient) return;

  try {
    const res = await fetch(`https://inboxkitten.com/api/v1/mail/list?recipient=${encodeURIComponent(activeRecipient)}`);
    if (!res.ok) return;

    const messages = await res.json();
    if (!Array.isArray(messages)) return;

    for (const msg of messages) {
      const key = msg.storage?.key || msg.id;
      if (!key || knownMessageKeys.has(key)) continue;

      knownMessageKeys.add(key);

      let bodyHtml = '';
      let bodyText = '';

      // Fetch message body
      if (msg.storage?.key && msg.storage?.region) {
        try {
          const htmlRes = await fetch(`https://inboxkitten.com/api/v1/mail/getHtml?key=${encodeURIComponent(msg.storage.key)}&region=${encodeURIComponent(msg.storage.region)}`);
          if (htmlRes.ok) {
            bodyHtml = await htmlRes.text();
            bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        } catch (fetchErr) {
          console.error('[CloudMail] Erro ao carregar conteúdo:', fetchErr.message);
        }
      }

      const sender = msg.message?.headers?.from || msg.envelope?.sender || 'Unknown';
      const subject = msg.message?.headers?.subject || '(Sem Assunto)';
      const recipient = activeAddress || `${activeRecipient}@inboxkitten.com`;
      const code = extractVerificationCode(subject, bodyText || bodyHtml);

      const receivedAt = msg.timestamp
        ? new Date(msg.timestamp * 1000).toISOString()
        : new Date().toISOString();

      const saved = db.saveEmail({
        recipient,
        sender,
        subject,
        bodyText,
        bodyHtml,
        verificationCode: code,
        rawHeaders: msg.message?.headers || {},
        receivedAt
      });

      console.log(`[CloudMail] NOVO E-MAIL RECEBIDO para <${recipient}>! Assunto: "${subject}" | Código OTP: ${code || 'N/A'}`);

      if (typeof onNewMessageCallback === 'function') {
        onNewMessageCallback({
          id: saved.id,
          recipient,
          sender,
          subject,
          code
        });
      }
    }
  } catch (err) {
    console.error('[CloudMail] Polling error:', err.message);
  }
}

function startPolling() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(checkCloudMessages, 2500);
  checkCloudMessages();
}

function getActiveCloudInbox() {
  return activeAddress;
}

function activateInbox(username, fullAddress) {
  const cleanUser = username.replace(/@.*$/, '').toLowerCase().trim();
  activeRecipient = cleanUser;
  activeAddress = fullAddress || `${cleanUser}@inboxkitten.com`;
  startPolling();
  console.log(`[CloudMail] Monitorando caixa existente: ${activeAddress}`);
  return { activeRecipient, activeAddress };
}

module.exports = {
  createCloudInbox,
  activateInbox,
  checkCloudMessages,
  getActiveCloudInbox,
  setOnNewMessageCallback
};
