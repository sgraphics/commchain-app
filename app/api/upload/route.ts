import { NextRequest, NextResponse } from 'next/server';
import 'isomorphic-fetch';
import { uploadToStoracha } from '../../utils/storacha';

export async function POST(request: NextRequest) {
  try {
    // Get the file data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string || file.name;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Convert File to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Upload using the server-side Storacha client
    const cid = await uploadToStoracha(data, filename);
    
    return NextResponse.json({ success: true, cid });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
} 