const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, '..', 'emails.db');
const db = new DatabaseSync(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    sender TEXT,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    verification_code TEXT,
    raw_headers TEXT,
    received_at TEXT NOT NULL,
    is_read INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_recipient ON emails(recipient);
  CREATE INDEX IF NOT EXISTS idx_received_at ON emails(received_at);

  CREATE TABLE IF NOT EXISTS inboxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    domain TEXT NOT NULL,
    full_name TEXT,
    location_json TEXT,
    phone TEXT,
    access_key TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_inbox_address ON inboxes(address);
  CREATE INDEX IF NOT EXISTS idx_inbox_key ON inboxes(access_key);
`);

// Email Statements
const insertStmt = db.prepare(`
  INSERT INTO emails (recipient, sender, subject, body_text, body_html, verification_code, raw_headers, received_at, is_read)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
`);

const getAllStmt = db.prepare(`
  SELECT id, recipient, sender, subject, verification_code, received_at, is_read,
         substr(coalesce(body_text, ''), 1, 140) as preview
  FROM emails
  ORDER BY id DESC
`);

const getByRecipientStmt = db.prepare(`
  SELECT id, recipient, sender, subject, verification_code, received_at, is_read,
         substr(coalesce(body_text, ''), 1, 140) as preview
  FROM emails
  WHERE lower(recipient) = lower(?)
  ORDER BY id DESC
`);

const getByIdStmt = db.prepare(`
  SELECT * FROM emails WHERE id = ?
`);

const markAsReadStmt = db.prepare(`
  UPDATE emails SET is_read = 1 WHERE id = ?
`);

const deleteByIdStmt = db.prepare(`
  DELETE FROM emails WHERE id = ?
`);

const clearAllStmt = db.prepare(`
  DELETE FROM emails
`);

const getStatsStmt = db.prepare(`
  SELECT COUNT(*) as total,
         COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread,
         COUNT(CASE WHEN verification_code IS NOT NULL THEN 1 END) as with_code
  FROM emails
`);

// Inboxes Statements
const insertInboxStmt = db.prepare(`
  INSERT OR REPLACE INTO inboxes (address, username, domain, full_name, location_json, phone, access_key, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getInboxByAddressStmt = db.prepare(`
  SELECT * FROM inboxes WHERE lower(address) = lower(?)
`);

const getInboxByKeyStmt = db.prepare(`
  SELECT * FROM inboxes WHERE access_key = ?
`);

const getAllInboxesStmt = db.prepare(`
  SELECT i.*, COUNT(e.id) as email_count
  FROM inboxes i
  LEFT JOIN emails e ON lower(e.recipient) = lower(i.address)
  GROUP BY i.id
  ORDER BY i.id DESC
`);

module.exports = {
  // Emails
  saveEmail({ recipient, sender, subject, bodyText, bodyHtml, verificationCode, rawHeaders, receivedAt }) {
    const timestamp = receivedAt || new Date().toISOString();
    const result = insertStmt.run(
      (recipient || '').toLowerCase().trim(),
      sender || 'Unknown Sender',
      subject || '(Sem Assunto)',
      bodyText || '',
      bodyHtml || '',
      verificationCode || null,
      typeof rawHeaders === 'object' ? JSON.stringify(rawHeaders) : (rawHeaders || ''),
      timestamp
    );
    return { id: Number(result.lastInsertRowid) };
  },

  getAllEmails(filterRecipient = null) {
    if (filterRecipient && filterRecipient.trim() !== '') {
      return getByRecipientStmt.all(filterRecipient.toLowerCase().trim());
    }
    return getAllStmt.all();
  },

  getEmailById(id) {
    const email = getByIdStmt.get(id);
    if (email) {
      markAsReadStmt.run(id);
      email.is_read = 1;
    }
    return email || null;
  },

  deleteEmail(id) {
    return deleteByIdStmt.run(id);
  },

  clearAll() {
    return clearAllStmt.run();
  },

  getStats() {
    return getStatsStmt.get();
  },

  // Permanent Inboxes
  saveInbox({ address, username, domain, fullName, location, phone, accessKey }) {
    const normalizedAddress = address.toLowerCase().trim();
    // Check if inbox already exists to preserve its existing access_key
    const existing = getInboxByAddressStmt.get(normalizedAddress);
    const key = accessKey || (existing ? existing.access_key : crypto.randomBytes(8).toString('hex'));
    const locString = typeof location === 'object' ? JSON.stringify(location) : (location || '');
    const createdAt = existing ? existing.created_at : new Date().toISOString();

    insertInboxStmt.run(
      normalizedAddress,
      username,
      domain,
      fullName || '',
      locString,
      phone || '',
      key,
      createdAt
    );

    return {
      address: normalizedAddress,
      accessKey: key
    };
  },

  getInbox(query) {
    if (!query) return null;
    const clean = query.trim();
    // Try by access key first, then by address
    let inbox = getInboxByKeyStmt.get(clean);
    if (!inbox) {
      inbox = getInboxByAddressStmt.get(clean.toLowerCase());
    }
    if (inbox && inbox.location_json) {
      try {
        inbox.location = JSON.parse(inbox.location_json);
      } catch {
        inbox.location = null;
      }
    }
    return inbox || null;
  },

  getAllInboxes() {
    const inboxes = getAllInboxesStmt.all();
    return inboxes.map(inbox => {
      if (inbox.location_json) {
        try {
          inbox.location = JSON.parse(inbox.location_json);
        } catch {
          inbox.location = null;
        }
      }
      return inbox;
    });
  }
};
