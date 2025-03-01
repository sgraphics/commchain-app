const nacl = require('tweetnacl');
const { decode: decodeBase64, encode: encodeBase64 } = require('@stablelib/base64');
const fs = require('fs');

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

// Convert from Base64
const privateKey = decodeBase64(privateKeyBase64);
const nonce = decodeBase64(encryptedPayload.nonce);
const encryptedData = decodeBase64(encryptedPayload.encryptedData);
const encryptedKey = decodeBase64(encryptedPayload.encryptedKey);

// Decrypt the symmetric key
const symmetricKey = nacl.box.open.before(encryptedKey, privateKey);
if (!symmetricKey) {
  console.error('Failed to decrypt the symmetric key');
  process.exit(1);
}

// Decrypt the data
const decryptedData = nacl.secretbox.open(encryptedData, nonce, symmetricKey);
if (!decryptedData) {
  console.error('Failed to decrypt the data');
  process.exit(1);
}

// Write the decrypted data to a file
const outputPath = 'decrypted-evidence.bin';
fs.writeFileSync(outputPath, Buffer.from(decryptedData));
console.log(`Decryption successful! Decrypted data written to ${outputPath}`); 