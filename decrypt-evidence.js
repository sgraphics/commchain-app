const nacl = require('tweetnacl');
const { decode: decodeBase64, encode: encodeBase64 } = require('@stablelib/base64');
const fs = require('fs');
const crypto = require('crypto');

// Get the private key from environment variable or argument
const privateKeyBase64 = process.env.ENCRYPTION_PRIVATE_KEY || process.argv[2];
if (!privateKeyBase64) {
  console.error('Please provide the private key as an argument or set ENCRYPTION_PRIVATE_KEY environment variable');
  process.exit(1);
}

// Get the encrypted payload from file
const encryptedPayloadPath = process.argv[3];
if (!encryptedPayloadPath) {
  console.error('Please provide the path to the encrypted payload JSON file');
  process.exit(1);
}

// Read and parse the encrypted payload
const encryptedPayload = JSON.parse(fs.readFileSync(encryptedPayloadPath, 'utf8'));

// Check if we have all required fields for asymmetric decryption
if (!encryptedPayload.nonce || !encryptedPayload.encryptedData || !encryptedPayload.senderPublicKey) {
  console.error('Invalid payload format - missing required fields for asymmetric decryption');
  process.exit(1);
}

// Convert from Base64
let privateKey;
if (privateKeyBase64.startsWith('b64:')) {
  privateKey = decodeBase64(privateKeyBase64.substring(4));
} else {
  console.error('Invalid private key format - must start with b64:');
  process.exit(1);
}

const nonce = decodeBase64(encryptedPayload.nonce);
const encryptedData = decodeBase64(encryptedPayload.encryptedData);
const senderPublicKey = decodeBase64(encryptedPayload.senderPublicKey);

// Ensure the key is the right length
if (privateKey.length !== nacl.box.secretKeyLength) {
  console.error(`Invalid private key length: ${privateKey.length}. Expected ${nacl.box.secretKeyLength}`);
  process.exit(1);
}

// Decrypt the data
const decryptedData = nacl.box.open(
  encryptedData,
  nonce,
  senderPublicKey,
  privateKey
);

if (!decryptedData) {
  console.error('Decryption failed - possibly incorrect key or corrupted data');
  process.exit(1);
}

// Write the decrypted data to a file
const outputPath = 'decrypted-evidence.bin';
fs.writeFileSync(outputPath, Buffer.from(decryptedData));
console.log(`Decryption successful! Decrypted data written to ${outputPath}`);

// Try to detect image format and save with appropriate extension
if (decryptedData.slice(0, 2).toString() === Buffer.from([0xFF, 0xD8]).toString()) {
  // JPEG signature
  const jpgPath = 'decrypted-evidence.jpg';
  fs.writeFileSync(jpgPath, Buffer.from(decryptedData));
  console.log(`Detected JPEG image, also saved as ${jpgPath}`);
} else if (decryptedData.slice(0, 8).toString() === Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString()) {
  // PNG signature
  const pngPath = 'decrypted-evidence.png';
  fs.writeFileSync(pngPath, Buffer.from(decryptedData));
  console.log(`Detected PNG image, also saved as ${pngPath}`);
} 