// src/lib/family/invite-code.ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 ambiguos

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
