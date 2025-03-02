import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTaskById } from '@/app/data/mockTasks';
import { parseSeedPhrase } from 'near-seed-phrase';
import { KeyPair, utils } from 'near-api-js';
import crypto from 'crypto';

// Define a type for OpenAI errors
interface OpenAIError {
  response?: {
    data?: any;
    status?: number;
    headers?: any;
  };
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { taskId, blockchainId, authToken } = body;
    
    console.log("Received parameters:");
    console.log("- taskId:", taskId);
    console.log("- blockchainId:", blockchainId);
    console.log("- authToken type:", typeof authToken);
    console.log("- authToken length:", authToken ? authToken.length : 0);
    
    // Get task instructions early to use in thread creation
    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Add blockchain ID to instructions if provided
    const instructions = task.ai_verification_instructions || "";
    const messageContent = blockchainId ? 
      `${instructions}\n\nBlockchain Transaction ID: ${blockchainId}` : 
      instructions;
    
    // Parse the auth token for logging purposes
    let authObject;
    if (typeof authToken === 'string') {
      try {
        authObject = JSON.parse(authToken);
        console.log("- authToken keys:", Object.keys(authObject));
        console.log("- Contains signature:", authObject.signature);
        console.log("- Contains accountId:", authObject.accountId);
        console.log("- Contains publicKey:", authObject.publicKey);
        console.log("- Contains nonce:", authObject.nonce);
        console.log("- Contains message:", authObject.message);
        console.log("- Contains recipient:", authObject.recipient);
        console.log("- Contains callbackUrl:", authObject.callbackUrl);
        
        // Log warnings about missing fields but don't modify the auth object
        if (!authObject.nonce) {
          console.warn("WARNING: Auth token is missing nonce field - signature may be invalid");
        }
        if (!authObject.recipient) {
          console.warn("WARNING: Auth token is missing recipient field - signature may be invalid");
        }
        if (!authObject.callbackUrl) {
          console.warn("WARNING: Auth token is missing callbackUrl field - this may be optional");
        }
      } catch (e) {
        console.log("- authToken is not valid JSON:", 
          e instanceof Error ? e.message : String(e));
        return NextResponse.json(
          { error: 'Invalid auth token format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Auth token must be a string' },
        { status: 400 }
      );
    }
    
    // Validate inputs
    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    //-------------------- THIS IS NEW --------------------

    const seedPhrase = process.env.SEED_PHRASE || ""; // Replace with actual phrase
    const { secretKey } = parseSeedPhrase(seedPhrase);
    const keyPair = KeyPair.fromString(secretKey as any);

    const newNonce = String(Date.now());
    // 2) Exactly the same content you'd pass to signMessage
    const nonceBuffer = crypto.randomBytes(32); 
    const signData = {
      message: "Login to NEAR AI",
      nonce: newNonce,
      recipient: "ai.near",
      callback_url: "http://localhost:3001/?authFlow=ai"
    };

    // 3) Sign that JSON-serialized data
    const bytes = Buffer.from(JSON.stringify(signData));
    const { signature, publicKey } = keyPair.sign(bytes);

    // 4) Print out results
    console.log("signature:", utils.serialize.base_encode(signature)); // base58
    console.log("publicKey:", publicKey.toString());                   // e.g. "ed25519:XYZ..."
    console.log("signedData:", signData);

    authObject = {
      signature: utils.serialize.base_encode(signature),
      account_id: "commchain.near",
      public_key: publicKey.toString(),
      message: "Login to NEAR AI",
      nonce: newNonce,
      recipient: "ai.near",
      callback_url: "http://localhost:3001/?authFlow=ai"
    };

    // Use JSON.stringify for the full auth object
    const authJSON = JSON.stringify(authObject);

    //--------------------------------------------------------
    
    // Authentication approach
    console.log("Trying with self-signed token...");
    const openai = new OpenAI({
      baseURL: "https://api.near.ai/v1",
      apiKey: `Bearer ${authJSON}`,
    });
    
    // Create thread with initial message parameters
    console.log("Creating thread with initial message...");
    const thread = await openai.beta.threads.create();
    
    console.log("Thread created successfully:", thread.id);

    const message = await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: messageContent
      }
    );
    
    console.log("Running assistant...");
    // Run the assistant
    const assistant_id = "commchain.near/completions/latest";
    const run = await openai.beta.threads.runs.createAndPoll(
      thread.id,
      { assistant_id }
    );
    
    console.log("Run completed with status:", run.status);
    // Get the response
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      for (const message of messages.data) {
        if (message.role === 'assistant') {
          // Check content type and safely access text value
          const content = message.content[0];
          if (content.type === 'text') {
            return NextResponse.json({ result: content.text.value });
          }
        }
      }
      // Return a default response
      return NextResponse.json({ result: "Received non-text response from AI verification" });
    }
    
    return NextResponse.json({ result: `AI verification process status: ${run.status}` });
  } catch (error) {
    console.error("Server-side AI verification error:", error);
    const openAIError = error as OpenAIError;
    // Log full error details
    if (openAIError.response) {
      console.error("Response data:", openAIError.response.data);
      console.error("Response status:", openAIError.response.status);
      console.error("Response headers:", openAIError.response.headers);
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 