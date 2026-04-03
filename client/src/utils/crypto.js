import CryptoJS from 'crypto-js';

const SECRET = 'shieldtalk_encrypt_key_defence';

export const encrypt = (text) => CryptoJS.AES.encrypt(text, SECRET).toString();

export const decrypt = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '[Decryption Failed]';
  }
};
