/**
 * Cloudflare Worker Script Template
 * Free Catch-All Email Routing to your Webhook endpoint.
 *
 * How it works:
 * 1. Add your domain (e.g. sapokas.com) to Cloudflare (Free plan).
 * 2. In Cloudflare Dashboard -> Email Routing -> Routing Rules:
 *    Set "Catch-all rule" -> Action: "Send to a Worker" -> Select this Worker.
 * 3. Every email sent to *@sapokas.com is forwarded to your webhook!
 */

function getCloudflareWorkerScript(webhookUrl = 'https://YOUR_WEBHOOK_URL/api/webhook/email') {
  return `export default {
  async email(message, env, ctx) {
    const rawEmail = await new Response(message.raw).text();
    const payload = {
      from: message.from,
      to: message.to,
      subject: message.headers.get('subject') || '',
      raw: rawEmail
    };

    try {
      const response = await fetch('${webhookUrl}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': env.WEBHOOK_SECRET || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Webhook error:', response.status);
      }
    } catch (err) {
      console.error('Failed to send email to webhook:', err);
    }
  }
};`;
}

module.exports = { getCloudflareWorkerScript };
