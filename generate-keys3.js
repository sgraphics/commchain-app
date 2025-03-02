const nacl = require('tweetnacl');
const { encode: encodeBase64 } = require('@stablelib/base64');

// Generate a new random secret key for NaCl secretbox
const secretKey = nacl.randomBytes(nacl.secretbox.keyLength);

// Convert to Base64 for storage
const secretKeyBase64 = encodeBase64(secretKey);

console.log('=== NACL SECRETBOX KEY ===');
console.log('Secret Key (KEEP THIS SECRET):');
console.log(`b64:${secretKeyBase64}`);
console.log('\nFor your .env.local file:');
console.log(`ENCRYPTION_KEY=b64:${secretKeyBase64}`);
console.log('\nFor your .env file (development only):');
console.log(`NEXT_PUBLIC_ENCRYPTION_KEY=b64:${secretKeyBase64}`);
console.log('\nWARNING: In production, never expose the encryption key to the client.');
console.log('For production, use a different key on the server side for decryption.'); 