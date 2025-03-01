const nacl = require('tweetnacl');
const { encode: encodeBase64 } = require('@stablelib/base64');

// Generate a new key pair
const keyPair = nacl.box.keyPair();

// Convert to Base64 for storage
const publicKeyBase64 = encodeBase64(keyPair.publicKey);
const privateKeyBase64 = encodeBase64(keyPair.secretKey);

console.log('=== ENCRYPTION KEYS ===');
console.log('Public Key (safe to include in client code):');
console.log(publicKeyBase64);
console.log('\nPrivate Key (KEEP THIS SECRET):');
console.log(privateKeyBase64);
console.log('\nAdd the public key to your ChatArea.tsx file:');
console.log(`const ENCRYPTION_PUBLIC_KEY = '${publicKeyBase64}';`);
console.log('\nStore the private key securely for the validator to use.'); 