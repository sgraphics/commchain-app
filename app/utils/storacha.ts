import { create } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import { importDAG } from '@ucanto/core/delegation'
import { CarReader } from '@ipld/car'
import * as Signer from '@ucanto/principal/ed25519'
import fs from 'fs/promises'
import path from 'path'

// Store client instance for reuse
let client: any = null

/**
 * Parse the proof from a base64 string
 */
async function parseProof(data: string) {
  const buffer = Buffer.from(data, 'base64')
  const reader = await CarReader.fromBytes(buffer)
  const blocks: any[] = []
  for await (const block of reader.blocks()) {
    blocks.push(block)
  }
  return importDAG(blocks)
}

async function parseProofFromFile(filePath: string) {
  const buffer = await fs.readFile(filePath)
  const reader = await CarReader.fromBytes(buffer)
  const blocks: any[] = []
  for await (const block of reader.blocks()) {
    blocks.push(block)
  }
  return importDAG(blocks)
}

/**
 * Initialize the Storacha client using environment variables
 */
export async function initStorachaClient() {
  if (client) return client

  try {
    console.log('Initializing Storacha client...')
    
    // Get the key from environment variables
    const keyStr = process.env.STORACHA_KEY
    if (!keyStr) {
      throw new Error('Missing STORACHA_KEY in environment variables')
    }
    
    // Parse the principal from the key
    const principal = Signer.parse(keyStr)
    
    // Create a client with the principal and a memory store
    client = await create({ principal, store: new StoreMemory() })
    
    // Parse and add the proof for the space
    const proof = await parseProofFromFile(path.join(process.cwd(), 'delegationb.car'))
    const space = await client.addSpace(proof)
    await client.setCurrentSpace(space.did())
    
    console.log('Storacha client initialized successfully with principal')
    return client
  } catch (error) {
    console.error('Error initializing Storacha client:', error)
    throw error
  }
}

/**
 * Upload a file to Storacha
 * @param data - The file data as Uint8Array
 * @param name - The filename
 * @returns The CID of the uploaded file
 */
export async function uploadToStoracha(data: Uint8Array, name: string): Promise<string> {
  console.log(`Uploading file ${name} (${data.length} bytes) to Storacha...`)
  
  try {
    const storageClient = await initStorachaClient()
    
    // Create a File object from the data
    const file = new File([data], name, { type: 'application/octet-stream' })
    
    // Upload the file
    console.log('Uploading via Storacha client...')
    const cid = await storageClient.uploadFile(file)
    console.log(`File uploaded successfully with CID: ${cid}`)
    
    return cid.toString()
  } catch (error) {
    console.error('Error uploading to Storacha:', error)
    throw error
  }
}

/**
 * Retrieve a file from Storacha by CID
 * @param cid - The CID of the file to retrieve
 * @returns The file data as Uint8Array
 */
export async function retrieveFromStoracha(cid: string): Promise<Uint8Array> {
  console.log(`Retrieving file with CID: ${cid}...`)
  
  try {
    // Construct the IPFS gateway URL
    const gatewayUrl = `https://${cid}.ipfs.w3s.link`
    
    // Fetch the file
    const response = await fetch(gatewayUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to retrieve file: ${response.statusText}`)
    }
    
    // Convert the response to a Uint8Array
    const arrayBuffer = await response.arrayBuffer()
    console.log(`File retrieved successfully, size: ${arrayBuffer.byteLength} bytes`)
    
    return new Uint8Array(arrayBuffer)
  } catch (error) {
    console.error('Error retrieving from Storacha:', error)
    throw error
  }
} 