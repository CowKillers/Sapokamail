/**
 * Intelligent Verification Code / OTP Extractor
 * Detects numeric and alphanumeric codes sent by Google, Steam, Discord, Microsoft, etc.
 */

function extractVerificationCode(subject, bodyText) {
  const cleanSubject = subject || '';
  const cleanBody = bodyText || '';
  const combined = `${cleanSubject}\n${cleanBody}`;

  const patterns = [
    // 1. Google format: G-123456
    /\b(G-\d{6})\b/i,

    // 2. Hyphenated 6-digit codes like 123-456
    /\b(\d{3}-\d{3})\b/,

    // 3. Labeled code on the same line: "code: 123456", "código de verificação: 849201", "access code 593012"
    /(?:verification\s*code|security\s*code|confirmation\s*code|sign[\s-]in\s*code|código\s*de\s*verificação|código\s*de\s*confirmação|código\s*de\s*segurança|activation\s*code|auth\s*code|one-time\s*passcode|access\s*code|código\s*de\s*acesso|otp|pin|código|code)[^\r\n0-9]{1,30}?\b([0-9]{4,8})\b/i,

    // 4. "is your code" or "é o seu código"
    /\b([0-9]{4,8})\b\s*(?:is\s*your\s*(?:verification|security|confirmation|sign[\s-]in|login)?\s*code|é\s*(?:o\s*)?seu\s*código)/i,

    // 5. Isolated standalone line with 4-8 digits (very common in Steam Guard, Uber, etc.)
    /(?:^|\r?\n)\s*([0-9]{4,8})\s*(?:\r?\n|$)/,

    // 6. 6-digit code in the subject line (e.g. "123456 is your code")
    /\b([0-9]{6})\b/
  ];

  for (const regex of patterns) {
    const match = combined.match(regex);
    if (match && match[1]) {
      const code = match[1].trim();
      // Avoid false positive years (e.g. 2024, 2025, 2026)
      if (!/^(202[0-9])$/.test(code)) {
        return code;
      }
    }
  }

  return null;
}

module.exports = { extractVerificationCode };
