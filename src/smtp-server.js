const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const db = require('./database');
const { extractVerificationCode } = require('./otp-extractor');

let smtpInstance = null;

function startSMTPServer(port = process.env.SMTP_PORT || 2525, onEmailReceived = null) {
  if (smtpInstance) {
    return smtpInstance;
  }

  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS', 'AUTH'],
    size: 20 * 1024 * 1024, // 20 MB max email size

    onData(stream, session, callback) {
      simpleParser(stream, (err, parsed) => {
        if (err) {
          console.error('[SMTP] Erro ao analisar MIME do e-mail:', err);
          return callback(new Error('Erro interno ao processar e-mail'));
        }

        try {
          const envelopeRecipients = session.envelope.rcptTo.map(r => r.address.toLowerCase().trim());
          const primaryRecipient = envelopeRecipients[0] || (parsed.to && parsed.to.text) || 'unknown@sapokas.com';

          const sender = parsed.from ? parsed.from.text : (session.envelope.mailFrom && session.envelope.mailFrom.address) || 'Unknown';
          const subject = parsed.subject || '(Sem Assunto)';
          const bodyText = parsed.text || '';
          const bodyHtml = parsed.html || parsed.textAsHtml || parsed.text || '';
          const code = extractVerificationCode(subject, bodyText);

          // Save for each recipient or the primary one
          const savedRecipients = envelopeRecipients.length > 0 ? envelopeRecipients : [primaryRecipient];
          for (const recipient of savedRecipients) {
            db.saveEmail({
              recipient,
              sender,
              subject,
              bodyText,
              bodyHtml,
              verificationCode: code,
              rawHeaders: Object.fromEntries(parsed.headers),
              receivedAt: parsed.date ? parsed.date.toISOString() : new Date().toISOString()
            });

            console.log(`[SMTP] E-mail recebido com sucesso para <${recipient}>! Assunto: "${subject}" | Código OTP: ${code || 'N/A'}`);
          }

          if (typeof onEmailReceived === 'function') {
            onEmailReceived({
              recipients: savedRecipients,
              sender,
              subject,
              code
            });
          }

          callback();
        } catch (saveErr) {
          console.error('[SMTP] Erro ao salvar e-mail no banco de dados:', saveErr);
          callback(new Error('Falha ao armazenar e-mail'));
        }
      });
    }
  });

  server.on('error', (err) => {
    console.warn(`[SMTP Server Aviso] ${err.message}`);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[SMTP Server] Rodando e escutando na porta ${port} (0.0.0.0:${port})`);
  });

  smtpInstance = server;
  return server;
}

module.exports = { startSMTPServer };
