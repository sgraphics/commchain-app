const nacl = require('tweetnacl');
const { encode: encodeBase64 } = require('@stablelib/base64');

// Generate a new key pair for nacl.box (asymmetric encryption)
const keyPair = nacl.box.keyPair();

// Convert to Base64 for storage
const publicKeyBase64 = encodeBase64(keyPair.publicKey);
const privateKeyBase64 = encodeBase64(keyPair.secretKey);

console.log('=== NACL BOX KEYPAIR ===');
console.log('Public Key (safe to include in client code):');
console.log(`b64:${publicKeyBase64}`);
console.log('\nFor your .env.local file (client side):');
console.log(`NEXT_PUBLIC_ENCRYPTION_PUBLIC_KEY=b64:${publicKeyBase64}`);
console.log('\nPrivate Key (KEEP THIS SECRET):');
console.log(`b64:${privateKeyBase64}`);
console.log('\nFor your .env.local file (server side only):');
console.log(`ENCRYPTION_PRIVATE_KEY=b64:${privateKeyBase64}`); 