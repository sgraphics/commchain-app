// Add Node fetch polyfill
import 'isomorphic-fetch';

import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { encode as encodeBase64, decode as decodeBase64 } from '@stablelib/base64';
import { retrieveFromStoracha } from '../../utils/storacha';
import crypto from 'crypto';

// Private key for decryption - ONLY available on the server
const ENCRYPTION_PRIVATE_KEY = process.env.ENCRYPTION_PRIVATE_KEY || "YOUR_PRIVATE_KEY_BASE64";

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
    
    // Check if we have all required fields for asymmetric decryption
    if (!payload.nonce || !payload.encryptedData || !payload.senderPublicKey) {
      throw new Error('Invalid payload format - missing required fields for asymmetric decryption');
    }
    
    // Get decryption components
    const nonce = decodeBase64(payload.nonce);
    const encryptedData = decodeBase64(payload.encryptedData);
    const senderPublicKey = decodeBase64(payload.senderPublicKey);
    
    // Prepare the private key
    let privateKey: Uint8Array;
    if (ENCRYPTION_PRIVATE_KEY.startsWith('b64:')) {
      privateKey = decodeBase64(ENCRYPTION_PRIVATE_KEY.substring(4));
    } else {
      throw new Error('Invalid private key format - must start with b64:');
    }
    
    // Ensure the key is the right length
    if (privateKey.length !== nacl.box.secretKeyLength) {
      throw new Error(`Invalid private key length: ${privateKey.length}. Expected ${nacl.box.secretKeyLength}`);
    }
    
    // Decrypt the data using Box
    const imageData = nacl.box.open(
      encryptedData,
      nonce,
      senderPublicKey,
      privateKey
    );
    
    if (!imageData) {
      throw new Error('Decryption failed - possibly incorrect key or corrupted data');
    }
    
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