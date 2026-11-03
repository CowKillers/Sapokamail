// US Mailbox Web Client with Restricted Guest Viewer Mode
let state = {
  currentIdentity: null,
  activeFilter: 'current',
  selectedEmailId: null,
  viewMode: 'html',
  mode: 'cloud',
  isGuestMode: false,
  lanIp: null,
  lanBaseUrl: null,
  publicUrl: null,
  emails: [],
  savedInboxes: []
};

// DOM Elements
const currentEmailInput = document.getElementById('currentEmail');
const btnCopyEmail = document.getElementById('btnCopyEmail');
const copyAlert = document.getElementById('copyAlert');
const permanentLinkInput = document.getElementById('permanentLinkInput');
const btnCopyPermanentLink = document.getElementById('btnCopyPermanentLink');
const copyLinkAlert = document.getElementById('copyLinkAlert');

const btnGenerateEmail = document.getElementById('btnGenerateEmail');
const currentModeBadge = document.getElementById('currentModeBadge');
const btnModeCloud = document.getElementById('btnModeCloud');
const btnModeSapokas = document.getElementById('btnModeSapokas');
const domainWarning = document.getElementById('domainWarning');
const activeInboxStatus = document.getElementById('activeInboxStatus');

// Identity details
const identityFullName = document.getElementById('identityFullName');
const identityLocation = document.getElementById('identityLocation');
const identityPhone = document.getElementById('identityPhone');
const identityId = document.getElementById('identityId');

// Simulator
const btnSimulateEmail = document.getElementById('btnSimulateEmail');
const selectService = document.getElementById('selectService');

// Inbox list & viewer
const emailListContainer = document.getElementById('emailListContainer');
const emailReaderContainer = document.getElementById('emailReaderContainer');
const countTotal = document.getElementById('countTotal');
const tabAll = document.getElementById('tabAll');
const tabCurrentOnly = document.getElementById('tabCurrentOnly');
const btnRefreshInbox = document.getElementById('btnRefreshInbox');
const btnClearInbox = document.getElementById('btnClearInbox');

// Modals
const btnOpenCloudflareGuide = document.getElementById('btnOpenCloudflareGuide');
const modalGuide = document.getElementById('modalGuide');
const btnCloseGuide = document.getElementById('btnCloseGuide');
const btnCloseGuideFooter = document.getElementById('btnCloseGuideFooter');
const cfWorkerCode = document.getElementById('cfWorkerCode');
const btnCopyWorkerCode = document.getElementById('btnCopyWorkerCode');

const btnOpenSavedInboxes = document.getElementById('btnOpenSavedInboxes');
const modalSavedInboxes = document.getElementById('modalSavedInboxes');
const btnCloseSavedInboxes = document.getElementById('btnCloseSavedInboxes');
const btnCloseSavedInboxesFooter = document.getElementById('btnCloseSavedInboxesFooter');
const savedInboxesContainer = document.getElementById('savedInboxesContainer');
const savedInboxesCount = document.getElementById('savedInboxesCount');

// QR Code Modal Elements
const btnOpenQrModal = document.getElementById('btnOpenQrModal');
const modalQrCode = document.getElementById('modalQrCode');
const btnCloseQrCode = document.getElementById('btnCloseQrCode');
const btnCloseQrCodeFooter = document.getElementById('btnCloseQrCodeFooter');
const qrCodeImg = document.getElementById('qrCodeImg');
const mobileLinkInput = document.getElementById('mobileLinkInput');
const btnCopyMobileLink = document.getElementById('btnCopyMobileLink');
const btnShareWhatsapp = document.getElementById('btnShareWhatsapp');

// Helper: copy text to clipboard
async function copyToClipboard(text, alertEl = null) {
  try {
    await navigator.clipboard.writeText(text);
    if (alertEl) {
      alertEl.classList.add('show');
      setTimeout(() => alertEl.classList.remove('show'), 2000);
    }
    return true;
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (alertEl) {
      alertEl.classList.add('show');
      setTimeout(() => alertEl.classList.remove('show'), 2000);
    }
    return true;
  }
}

// 1. Generate Dedicated Read-Only URL (Prioritizes Global Public HTTPS Tunnel for 4G/5G)
function getShareableUrl(accessKey) {
  const base = state.publicUrl || state.lanBaseUrl || window.location.origin;
  return `${base}/view/${accessKey}`;
}

// 2. Save Current Inbox to Database
async function persistCurrentInbox() {
  const id = state.currentIdentity;
  if (!id || !id.email) return;

  try {
    const res = await fetch('/api/inboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: id.email,
        username: id.username,
        domain: id.domain,
        fullName: id.fullName,
        location: id.location,
        phone: id.phone,
        accessKey: id.accessKey || null
      })
    });
    const data = await res.json();
    if (data.success && data.inbox) {
      id.accessKey = data.inbox.accessKey;
    }
    updateSavedInboxesCount();
  } catch (err) {
    console.error('Erro ao salvar caixa permanente:', err);
  }
}

// 3. Generate New Realistic US Email (Master Mode Only)
async function generateNewEmail() {
  if (state.isGuestMode) return; // Disallowed in guest mode

  btnGenerateEmail.disabled = true;
  activeInboxStatus.textContent = 'Gerando identidade e conectando caixa...';

  try {
    const res = await fetch('/api/generate?domain=sapokas.com');
    const data = await res.json();
    if (!data.success) throw new Error('Falha ao gerar dados');

    state.currentIdentity = data.identity;

    if (state.mode === 'cloud') {
      const cleanUser = state.currentIdentity.username.replace(/[^a-z0-9]/g, '');
      const cloudRes = await fetch('/api/cloud/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser })
      });
      const cloudData = await cloudRes.json();

      if (cloudData.success) {
        state.currentIdentity.email = cloudData.address;
        state.currentIdentity.domain = cloudData.domain;
        state.currentIdentity.username = cloudData.username;
        activeInboxStatus.textContent = 'Caixa na Web conectada e pronta para receber!';
      }
    } else {
      activeInboxStatus.textContent = 'Monitorando servidor local SMTP e Webhook...';
    }

    await persistCurrentInbox();
    renderCurrentIdentity();
    loadEmails();
  } catch (err) {
    console.error('Erro ao gerar e-mail:', err);
    activeInboxStatus.textContent = 'Erro ao conectar. Tente novamente.';
  } finally {
    btnGenerateEmail.disabled = false;
  }
}

// 4. Load a Specific Inbox (Used for Dedicated Links)
async function loadInboxFromUrl(targetKey) {
  activeInboxStatus.textContent = `Carregando caixa de entrada...`;

  try {
    const res = await fetch(`/api/inboxes/${encodeURIComponent(targetKey)}`);
    const data = await res.json();

    if (data.success && data.inbox) {
      const inbox = data.inbox;
      state.currentIdentity = {
        email: inbox.address,
        username: inbox.username,
        domain: inbox.domain,
        fullName: inbox.full_name || 'US Citizen',
        location: inbox.location || { city: 'New York', state: 'NY', zip: '10001' },
        phone: inbox.phone || '+1 (555) 019-2834',
        accessKey: inbox.access_key
      };

      renderCurrentIdentity();
      loadEmails();
      activeInboxStatus.textContent = 'Monitorando mensagens em tempo real...';
      return true;
    }
  } catch (err) {
    console.error('Erro ao carregar caixa pela chave:', err);
  }

  return false;
}

function renderCurrentIdentity() {
  const id = state.currentIdentity;
  if (!id) return;

  currentEmailInput.value = id.email;
  identityFullName.textContent = id.fullName;
  identityLocation.textContent = `${id.location.city}, ${id.location.state} (${id.location.zip})`;
  identityPhone.textContent = id.phone;
  identityId.textContent = `${id.location.state}-${id.username.split('@')[0]}`;

  if (permanentLinkInput && id.accessKey) {
    permanentLinkInput.value = getShareableUrl(id.accessKey);
  }

  if (state.isGuestMode) {
    currentModeBadge.textContent = '🔒 Modo Leitor';
    currentModeBadge.style.color = '#c084fc';
    currentModeBadge.style.backgroundColor = 'rgba(192, 132, 252, 0.15)';
    currentModeBadge.style.borderColor = 'rgba(192, 132, 252, 0.3)';
  } else if (state.mode === 'cloud') {
    currentModeBadge.textContent = '🌐 E-mail Real Ativo na Web';
    currentModeBadge.style.color = '#34d399';
    currentModeBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
    currentModeBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    domainWarning.style.display = 'none';
  } else {
    currentModeBadge.textContent = '⚙️ Modo @sapokas.com';
    currentModeBadge.style.color = 'var(--accent-blue)';
    currentModeBadge.style.backgroundColor = 'rgba(59, 130, 246, 0.12)';
    currentModeBadge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
    domainWarning.style.display = 'block';
  }
}

// 5. Load Emails
async function loadEmails() {
  try {
    let url = '/api/emails';
    // In guest mode, always lock to the current inbox address!
    if ((state.isGuestMode || state.activeFilter === 'current') && state.currentIdentity) {
      url += `?recipient=${encodeURIComponent(state.currentIdentity.email)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      state.emails = data.emails;
      renderEmailList();
    }

    const statsRes = await fetch('/api/stats');
    const statsData = await statsRes.json();
    if (statsData.success) {
      countTotal.textContent = statsData.stats.total || 0;
    }
  } catch (err) {
    console.error('Erro ao carregar e-mails:', err);
  }
}

function renderEmailList() {
  if (!state.emails.length) {
    emailListContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📬</div>
        <h3>Nenhum e-mail recebido ainda</h3>
        <p>Aguardando códigos e mensagens para este endereço...</p>
      </div>
    `;
    return;
  }

  emailListContainer.innerHTML = state.emails.map(email => {
    const isActive = email.id === state.selectedEmailId;
    const isUnread = !email.is_read;
    const timeAgo = formatTimeAgo(email.received_at);

    return `
      <div class="email-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}" data-id="${email.id}">
        <div class="email-item-header">
          <span class="email-sender" title="${escapeHtml(email.sender)}">${escapeHtml(email.sender)}</span>
          <span class="email-time">${timeAgo}</span>
        </div>
        <div class="email-recipient-tag">Para: ${escapeHtml(email.recipient)}</div>
        <div class="email-subject">${escapeHtml(email.subject)}</div>
        ${email.verification_code ? `
          <div class="otp-badge-row">
            <span class="otp-code-text">CÓDIGO: ${escapeHtml(email.verification_code)}</span>
            <button class="btn-mini-copy" data-copy-code="${escapeHtml(email.verification_code)}" title="Copiar Código">Copiar</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  emailListContainer.querySelectorAll('.email-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy-code]');
      if (copyBtn) {
        e.stopPropagation();
        const code = copyBtn.getAttribute('data-copy-code');
        copyToClipboard(code);
        copyBtn.textContent = 'Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
        return;
      }

      const id = Number(item.getAttribute('data-id'));
      openEmail(id);
    });
  });
}

// 6. Open Single Email
async function openEmail(id) {
  state.selectedEmailId = id;
  renderEmailList();

  try {
    const res = await fetch(`/api/emails/${id}`);
    const data = await res.json();
    if (data.success) {
      renderEmailReader(data.email);
    }
  } catch (err) {
    console.error('Erro ao abrir e-mail:', err);
  }
}

function renderEmailReader(email) {
  const hasCode = !!email.verification_code;

  emailReaderContainer.innerHTML = `
    <div class="reader-container">
      ${hasCode ? `
        <div class="otp-hero-card">
          <div class="otp-hero-info">
            <span>Código de Verificação Detectado</span>
            <div class="otp-hero-code" id="heroOtpCode">${escapeHtml(email.verification_code)}</div>
          </div>
          <button class="btn-otp-copy" id="btnHeroCopyOtp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copiar Código
          </button>
        </div>
      ` : ''}

      <div class="reader-meta">
        <h2 class="reader-subject">${escapeHtml(email.subject)}</h2>
        <div class="meta-grid">
          <div class="meta-item"><strong>De:</strong> ${escapeHtml(email.sender)}</div>
          <div class="meta-item"><strong>Para:</strong> <span class="font-mono">${escapeHtml(email.recipient)}</span></div>
          <div class="meta-item"><strong>Data:</strong> ${new Date(email.received_at).toLocaleString('pt-BR')}</div>
          <div class="meta-item"><strong>Status:</strong> Salvo e Verificado</div>
        </div>
      </div>

      <div class="reader-view-nav">
        <div class="view-tabs">
          <button class="view-tab ${state.viewMode === 'html' ? 'active' : ''}" id="btnViewHtml">Visualização HTML</button>
          <button class="view-tab ${state.viewMode === 'text' ? 'active' : ''}" id="btnViewText">Texto Puro</button>
        </div>
        ${!state.isGuestMode ? `
          <button class="btn btn-ghost btn-sm btn-danger-text" id="btnDeleteCurrentEmail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Excluir Este E-mail
          </button>
        ` : ''}
      </div>

      ${state.viewMode === 'html' ? `
        <div class="reader-body-frame">
          <iframe id="emailFrame" sandbox="allow-same-origin"></iframe>
        </div>
      ` : `
        <div class="reader-body-text">${escapeHtml(email.body_text || '(Corpo de texto vazio)')}</div>
      `}
    </div>
  `;

  if (state.viewMode === 'html') {
    const frame = document.getElementById('emailFrame');
    if (frame) {
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open();
      const htmlContent = email.body_html || `<pre style="font-family:sans-serif;white-space:pre-wrap;">${escapeHtml(email.body_text || '')}</pre>`;
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 16px; }</style>
        </head>
        <body>${htmlContent}</body>
        </html>
      `);
      doc.close();
    }
  }

  const btnHeroCopyOtp = document.getElementById('btnHeroCopyOtp');
  if (btnHeroCopyOtp) {
    btnHeroCopyOtp.addEventListener('click', () => {
      copyToClipboard(email.verification_code);
      btnHeroCopyOtp.innerHTML = 'Copiado!';
      setTimeout(() => {
        btnHeroCopyOtp.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copiar Código
        `;
      }, 1500);
    });
  }

  const btnViewHtml = document.getElementById('btnViewHtml');
  const btnViewText = document.getElementById('btnViewText');
  if (btnViewHtml && btnViewText) {
    btnViewHtml.addEventListener('click', () => {
      state.viewMode = 'html';
      renderEmailReader(email);
    });
    btnViewText.addEventListener('click', () => {
      state.viewMode = 'text';
      renderEmailReader(email);
    });
  }

  const btnDeleteCurrentEmail = document.getElementById('btnDeleteCurrentEmail');
  if (btnDeleteCurrentEmail) {
    btnDeleteCurrentEmail.addEventListener('click', async () => {
      await fetch(`/api/emails/${email.id}`, { method: 'DELETE' });
      state.selectedEmailId = null;
      emailReaderContainer.innerHTML = `
        <div class="empty-reader">
          <div class="reader-placeholder-icon">📩</div>
          <p>Selecione um e-mail na lista para visualizá-lo e extrair o código.</p>
        </div>
      `;
      loadEmails();
    });
  }
}

// 7. Saved Inboxes History Modal
async function updateSavedInboxesCount() {
  if (state.isGuestMode) return;

  try {
    const res = await fetch('/api/inboxes');
    const data = await res.json();
    if (data.success && data.inboxes) {
      state.savedInboxes = data.inboxes;
      savedInboxesCount.textContent = data.inboxes.length;
    }
  } catch (err) {
    console.error('Erro ao atualizar contador de caixas:', err);
  }
}

async function renderSavedInboxesModal() {
  await updateSavedInboxesCount();

  if (!state.savedInboxes.length) {
    savedInboxesContainer.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma caixa salva ainda.</p>
      </div>
    `;
    return;
  }

  savedInboxesContainer.innerHTML = state.savedInboxes.map(inbox => {
    const permUrl = getShareableUrl(inbox.access_key);
    const dateFormatted = new Date(inbox.created_at).toLocaleDateString('pt-BR');

    return `
      <div class="saved-inbox-card">
        <div class="saved-inbox-info">
          <span class="saved-inbox-name">${escapeHtml(inbox.full_name || 'US Account')}</span>
          <span class="saved-inbox-addr">${escapeHtml(inbox.address)}</span>
          <div class="saved-inbox-meta">
            <span>📅 Criado em ${dateFormatted}</span>
            <span>✉️ ${inbox.email_count || 0} e-mail(s)</span>
          </div>
        </div>
        <div class="saved-inbox-actions">
          <button class="btn btn-secondary btn-sm" data-copy-perm="${escapeHtml(permUrl)}">Copiar Link</button>
          <button class="btn btn-primary btn-sm" data-open-inbox="${escapeHtml(inbox.access_key)}">Abrir</button>
        </div>
      </div>
    `;
  }).join('');

  savedInboxesContainer.querySelectorAll('[data-open-inbox]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-open-inbox');
      modalSavedInboxes.classList.remove('open');
      loadInboxFromUrl(key);
    });
  });

  savedInboxesContainer.querySelectorAll('[data-copy-perm]').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.getAttribute('data-copy-perm');
      copyToClipboard(link);
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = 'Copiar Link'; }, 1500);
    });
  });
}

// 8. Simulator
async function simulateEmail() {
  const service = selectService.value;
  btnSimulateEmail.disabled = true;
  btnSimulateEmail.innerHTML = 'Enviando simulação...';

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: state.currentIdentity ? state.currentIdentity.email : 'john.miller.us92@sapokas.com',
        service
      })
    });

    const data = await res.json();
    if (data.success) {
      await loadEmails();
      if (data.emailId) {
        openEmail(data.emailId);
      }
    }
  } catch (err) {
    alert('Erro ao disparar simulação: ' + err.message);
  } finally {
    btnSimulateEmail.disabled = false;
    btnSimulateEmail.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      Disparar E-mail de Teste
    `;
  }
}

// 9. Real-time Events (SSE)
function setupSSE() {
  const events = new EventSource('/api/events');
  events.addEventListener('new-email', (event) => {
    try {
      const data = JSON.parse(event.data);
      // In guest mode, only update if the email matches this inbox!
      if (state.isGuestMode && state.currentIdentity) {
        const targetRec = (state.currentIdentity.email || '').toLowerCase();
        const incomingRec = (data.recipient || '').toLowerCase();
        if (incomingRec !== targetRec) return;
      }

      loadEmails();
      if (data.id) {
        openEmail(data.id);
      }
      updateSavedInboxesCount();
    } catch (err) {
      console.error('SSE Error:', err);
    }
  });
}

// 10. Cloudflare Worker Guide Modal
async function loadCloudflareScript() {
  try {
    const res = await fetch('/api/cloudflare-script');
    const data = await res.json();
    if (data.success) {
      cfWorkerCode.textContent = data.script;
    }
  } catch (err) {
    cfWorkerCode.textContent = '// Erro ao carregar script do Cloudflare';
  }
}

function formatTimeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners
btnCopyEmail.addEventListener('click', () => {
  copyToClipboard(currentEmailInput.value, copyAlert);
});

btnCopyPermanentLink.addEventListener('click', () => {
  copyToClipboard(permanentLinkInput.value, copyLinkAlert);
});

btnGenerateEmail.addEventListener('click', generateNewEmail);

// Mode Tabs
btnModeCloud.addEventListener('click', () => {
  if (state.mode !== 'cloud') {
    state.mode = 'cloud';
    btnModeCloud.classList.add('active');
    btnModeSapokas.classList.remove('active');
    generateNewEmail();
  }
});

btnModeSapokas.addEventListener('click', () => {
  if (state.mode !== 'sapokas') {
    state.mode = 'sapokas';
    btnModeSapokas.classList.add('active');
    btnModeCloud.classList.remove('active');
    generateNewEmail();
  }
});

btnSimulateEmail.addEventListener('click', simulateEmail);
btnRefreshInbox.addEventListener('click', loadEmails);

btnClearInbox.addEventListener('click', async () => {
  if (confirm('Tem certeza que deseja apagar todos os e-mails recebidos desta caixa?')) {
    await fetch('/api/emails', { method: 'DELETE' });
    state.selectedEmailId = null;
    emailReaderContainer.innerHTML = `
      <div class="empty-reader">
        <div class="reader-placeholder-icon">📩</div>
        <p>Selecione um e-mail na lista para visualizá-lo e extrair o código.</p>
      </div>
    `;
    loadEmails();
  }
});

tabAll.addEventListener('click', () => {
  state.activeFilter = 'all';
  tabAll.classList.add('active');
  tabCurrentOnly.classList.remove('active');
  loadEmails();
});

tabCurrentOnly.addEventListener('click', () => {
  state.activeFilter = 'current';
  tabCurrentOnly.classList.add('active');
  tabAll.classList.remove('active');
  loadEmails();
});

// Modals
btnOpenCloudflareGuide.addEventListener('click', () => {
  loadCloudflareScript();
  modalGuide.classList.add('open');
});
btnCloseGuide.addEventListener('click', () => modalGuide.classList.remove('open'));
btnCloseGuideFooter.addEventListener('click', () => modalGuide.classList.remove('open'));

btnCopyWorkerCode.addEventListener('click', () => {
  copyToClipboard(cfWorkerCode.textContent);
  btnCopyWorkerCode.textContent = 'Script Copiado!';
  setTimeout(() => { btnCopyWorkerCode.textContent = 'Copiar Script do Worker'; }, 1500);
});

btnOpenSavedInboxes.addEventListener('click', () => {
  renderSavedInboxesModal();
  modalSavedInboxes.classList.add('open');
});
btnCloseSavedInboxes.addEventListener('click', () => modalSavedInboxes.classList.remove('open'));
btnCloseSavedInboxesFooter.addEventListener('click', () => modalSavedInboxes.classList.remove('open'));

// QR Code Modal Handler
async function openQrModal() {
  if (!state.currentIdentity || !state.currentIdentity.accessKey) return;

  const shareUrl = getShareableUrl(state.currentIdentity.accessKey);
  mobileLinkInput.value = shareUrl;

  // WhatsApp share link
  btnShareWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent('Link da minha caixa de entrada: ' + shareUrl)}`;

  // Generate QR Code
  try {
    qrCodeImg.src = '';
    const res = await fetch(`/api/qrcode?text=${encodeURIComponent(shareUrl)}`);
    const data = await res.json();
    if (data.success && data.qr) {
      qrCodeImg.src = data.qr;
    }
  } catch (err) {
    console.error('Erro ao gerar QR Code:', err);
  }

  modalQrCode.classList.add('open');
}

btnOpenQrModal?.addEventListener('click', openQrModal);
btnCloseQrCode?.addEventListener('click', () => modalQrCode.classList.remove('open'));
btnCloseQrCodeFooter?.addEventListener('click', () => modalQrCode.classList.remove('open'));

btnCopyMobileLink?.addEventListener('click', () => {
  copyToClipboard(mobileLinkInput.value);
  btnCopyMobileLink.textContent = 'Copiado!';
  setTimeout(() => { btnCopyMobileLink.textContent = 'Copiar'; }, 1500);
});

// Initialize: Determine if loading via shareable link or master mode
(async function init() {
  // Load Network & Public Tunnel info (Global HTTPS tunnel for 4G/5G mobile access)
  async function fetchNetworkInfo() {
    try {
      const netRes = await fetch('/api/network-info');
      const netData = await netRes.json();
      if (netData.success) {
        state.lanIp = netData.lanIp;
        state.lanBaseUrl = netData.lanBaseUrl;
        if (netData.publicUrl) {
          state.publicUrl = netData.publicUrl;
          if (state.currentIdentity && permanentLinkInput) {
            permanentLinkInput.value = getShareableUrl(state.currentIdentity.accessKey);
          }
        }
      }
    } catch (err) {
      console.warn('Network info unavailable, using default host');
    }
  }

  await fetchNetworkInfo();
  // Check again after 3 seconds in case tunnel just finished establishing
  setTimeout(fetchNetworkInfo, 3500);

  const urlParams = new URLSearchParams(window.location.search);
  const viewQuery = urlParams.get('view') || urlParams.get('inbox') || urlParams.get('key');

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const isViewPath = pathParts[0] === 'view' || pathParts[0] === 'inbox';
  const pathKey = isViewPath && pathParts[1] ? pathParts[1] : null;

  const targetKey = viewQuery || pathKey;

  if (targetKey) {
    // RESTRICTED GUEST / READ-ONLY MODE
    state.isGuestMode = true;
    document.body.classList.add('guest-mode');
    document.getElementById('cardHeaderTitle').textContent = 'Caixa Exclusiva';
    document.title = 'Caixa de Entrada Privada - US Mailbox';
    state.activeFilter = 'current';

    const loaded = await loadInboxFromUrl(targetKey);
    if (!loaded) {
      alert('Esta caixa de e-mail não foi encontrada.');
    }
  } else {
    // MASTER ADMIN MODE
    state.isGuestMode = false;
    document.body.classList.remove('guest-mode');
    await generateNewEmail();
    updateSavedInboxesCount();
  }

  setupSSE();
  setInterval(loadEmails, 3000);
})();
