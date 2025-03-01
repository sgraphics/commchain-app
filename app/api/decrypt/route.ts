// Add Node fetch polyfill
import 'isomorphic-fetch';

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { retrieveFromStoracha } from '../../utils/storacha';

// Private key for decryption - ONLY available on the server
const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDWrEtV9erzhal6
Q7O4kFIZwjkf5AclKyvnGY3E9BMs4zsoe3D/pZGI4hDUSPoK6/GXEgotzAW21ZkI
IQlf28ZyJ1eArM9Kubp1uMCeNhmcvfYWd/RePI+DR7iXfPXreUNaR+7aj+vNWhkM
KbHWWjSA4lomFeEOiAL81h6uMuemUCjU8tYkBjfqoeISmiAvfe+ezYn30jKJn/IL
I/FdaBiQPYqEKDgBU8QqO3ilaqdzNoIhcF4UBBLRHhO0AkzBNRvHN2gk7iOs8AlE
nu8rIXeJD+jP0gcA9F1rMFKZKxNLj6MR3WdI07/4Z2g4jODEQ1zopFua9HS3KGlZ
u+4sLh8/AgMBAAECggEAHz20uv5OYoE9sErhAUeTgycmTBNRzOFzAq9P1+1TSxGI
nvQT9khgnSSVIWe7Z9J9dqhL7e1GmZyNKEcyh45C24MJM3MyuaO81Hv+ICgsYwis
Iwny+LHkiszpurYXTdz4Zc+ZHZqbTOfDRGde95xqDqWiS++cMJKvqJ76mQxUdPnq
IGhoiHDd8+iAaTM/W7vyb4U1PrMY2xf1142AFvob9ssOe+Yk5zpTAwnJ+2HY+tdJ
eUYkhtt8BI67RfUCPuSDN9dJiO5Hdte4fNQW1Qd0MN6KsxLlcF41v1GxBg3NWm/t
glvTOcxvDXF4AhF7r74Dk98QWUssZvfYopacQC53IQKBgQD1tbJD+kfBQgYGUfWS
F5yy4EVb1mw2IvcD9yMZ2iG+nuXY+0LAl1doK8aLa4T195JgmVEvX3Qj1GBtReed
GlG+CEG2LjlC6TttQdW7O1Ft6RmnmVb0rYEX84AVEdoziPFP/XZlrOX1zzsWXBDW
ce4wYsBrGlVGdF/YEIdJAU8m3wKBgQDfqdjRKfYfPf72NnV8r+bDFiAD1LQKDuS1
IjvEspPUpqEA3aGabpwc7wqspCBwfq4zlLiBhkYffROMFIbg4be0piGcblf+/4DS
zmqRtD5uMOLK+Six546lgV3NGMLDwhnWNKuSBqjTHaF4bm9Z1VA9bDnoF2qQ92SG
3B2UTZ/zoQKBgQCCHIUZmh8FJ4EpN51ijz5bOod/6jvDLyC+6M+dkPTtjBcKn4Lp
mTqf3w50Jaty1Hae0JE9FL7bekrVkn7jolxG1Ph3EGMiG39si8AyNWcZXKZJKdny
Fy6VEExy29FAGPQv93gKv1PGpsYTQQ1pgUswNBrQnFErzdQzBg2diyPu4QKBgEJQ
UneZkF6s+/Y2KVlhsfKvkahxHTxKNCc8Uio8pDYNfXkLPUnTd7fga/LJ6tBPzwh+
FMJadFoLtIr43xC3+8a05wxBbxes254lE1XF8iirl+KEQzuUIygRFiWkLMLrvstS
7HesP8vwYhqZ66vf4h2EBBs7Lh5zKzwM8TwyU7VhAoGBAIje1GKn9HiObxJZuFUn
cK3Tf+61aLszmsJ2x33bznn+JuBNyYt+c9dyn4tlfeXC+WqW1hCltvI1/D7pfqdR
qhK2ELa6CqP0tfOFsVMQNU9cy0LJ7zHKWj+igCN7IuwO8l22G4Wr5GAnQMG7/nHi
AwgbBGIEqAzE82zVz+CfdwUG
-----END PRIVATE KEY-----`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cid = searchParams.get('cid');
  
  if (!cid) {
    return NextResponse.json({ error: 'CID is required' }, { status: 400 });
  }
  
  try {
    // Extract the actual CID from our custom format
    const actualCid = cid.replace('storj-', '');
    
    // Retrieve the encrypted data from Storacha
    const encryptedBytes = await retrieveFromStoracha(actualCid);
    
    // Parse the JSON payload
    const payloadText = new TextDecoder().decode(encryptedBytes);
    const payload = JSON.parse(payloadText);
    
    // Check if we have all required fields
    if (!payload.iv || !payload.encryptedData || !payload.encryptedKey) {
      throw new Error('Invalid payload format - missing required fields');
    }
    
    // Get decryption components
    const iv = Buffer.from(payload.iv, 'base64');
    const encryptedData = Buffer.from(payload.encryptedData, 'base64');
    const encryptedKey = Buffer.from(payload.encryptedKey, 'base64');
    
    // First decrypt the symmetric key with our private RSA key
    const symmetricKey = crypto.privateDecrypt(
      {
        key: RSA_PRIVATE_KEY,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      encryptedKey
    );
    
    // Then use the symmetric key to decrypt the data
    const decipher = crypto.createDecipheriv('aes-256-cbc', symmetricKey, iv);
    const imageData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    
    // Return the decrypted image
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="decrypted-image.jpg"`,
      },
    });
  } catch (error) {
    console.error('Error decrypting data:', error);
    return NextResponse.json({ 
      error: 'Failed to decrypt data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 