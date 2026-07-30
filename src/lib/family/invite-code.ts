// src/lib/family/invite-code.ts
import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 ambiguos

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return code;
}
