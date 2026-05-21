const crypto = require('crypto');

function generatePassword(length = 12) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{};:,.<>?';

  const all = upper + lower + digits + symbols;

  // Ensure password contains at least one char from each set
  let pwd = '';
  pwd += upper.charAt(crypto.randomInt(0, upper.length));
  pwd += lower.charAt(crypto.randomInt(0, lower.length));
  pwd += digits.charAt(crypto.randomInt(0, digits.length));
  pwd += symbols.charAt(crypto.randomInt(0, symbols.length));

  for (let i = pwd.length; i < length; i++) {
    pwd += all.charAt(crypto.randomInt(0, all.length));
  }

  // Shuffle
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

module.exports = { generatePassword };
