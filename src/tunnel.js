/**
 * Cloudflare Tunnel Manager
 * Creates a free, secure, global public HTTPS URL (via TryCloudflare)
 * Accessible on 4G/5G mobile networks worldwide without any port forwarding.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

let tunnelProcess = null;
let publicUrl = null;
let onUrlAvailable = null;

function getPublicUrl() {
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  return publicUrl;
}

function startTunnel(localPort = 3000, callback = null) {
  if (callback) onUrlAvailable = callback;

  // If running in cloud host (Render, Railway, etc.), use the host's own public URL
  if (process.env.RENDER || (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(__dirname, '..', 'cloudflared.exe')))) {
    publicUrl = process.env.RENDER_EXTERNAL_URL || null;
    console.log('[Tunnel] Ambiente de nuvem detectado. URL pública:', publicUrl || 'Ativa');
    if (publicUrl && typeof onUrlAvailable === 'function') {
      onUrlAvailable(publicUrl);
    }
    return;
  }

  const exePath = path.join(__dirname, '..', 'cloudflared.exe');
  if (!fs.existsSync(exePath)) {
    console.warn('[Tunnel] cloudflared.exe não encontrado na pasta raiz. Usando apenas IP local.');
    return;
  }

  console.log('[Tunnel] Iniciando túnel público global gratuito (Cloudflare)...');

  tunnelProcess = spawn(exePath, ['tunnel', '--url', `http://localhost:${localPort}`], {
    windowsHide: true
  });

  tunnelProcess.stderr.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0]) {
      publicUrl = match[0];
      console.log(`=======================================================`);
      console.log(`  🌐 HOST PÚBLICO GLOBAL ATIVO (4G / 5G / Celular):   `);
      console.log(`  ${publicUrl}                                         `);
      console.log(`=======================================================`);

      if (typeof onUrlAvailable === 'function') {
        onUrlAvailable(publicUrl);
      }
    }
  });

  tunnelProcess.on('close', (code) => {
    console.log(`[Tunnel] Processo de túnel finalizado com código ${code}.`);
    publicUrl = null;
  });

  tunnelProcess.on('error', (err) => {
    console.warn(`[Tunnel Aviso] Erro no túnel: ${err.message}`);
  });

  // Ensure clean exit on process shutdown
  process.on('exit', () => {
    if (tunnelProcess) {
      try { tunnelProcess.kill(); } catch {}
    }
  });
}

function stopTunnel() {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch {}
    tunnelProcess = null;
    publicUrl = null;
  }
}

module.exports = {
  startTunnel,
  stopTunnel,
  getPublicUrl
};
