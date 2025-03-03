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
    let task;
    try {
      task = getTaskById(taskId);
      if (!task) {
        console.error("Task not found for ID:", taskId);
        // Continue with a default task instead of returning an error
        task = { ai_verification_instructions: "Please verify this task." };
      }
    } catch (err) {
      console.error("Error fetching task:", err);
      // Continue with a default task
      task = { ai_verification_instructions: "Please verify this task." };
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
        // Continue with default auth object instead of returning an error
        authObject = {};
      }
    } else {
      console.error("Auth token is not a string");
      // Continue with default auth object
      authObject = {};
    }
    
    // Validate inputs - log warning but continue
    if (!taskId) {
      console.warn("Missing taskId parameter");
    }

    //-------------------- THIS IS NEW --------------------
    let authJSON;
    try {
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
      authJSON = JSON.stringify(authObject);
    } catch (err) {
      console.error("Error generating auth token:", err);
      // Continue with original auth token if available
      authJSON = typeof authToken === 'string' ? authToken : JSON.stringify({});
    }
    //--------------------------------------------------------
    
    // Authentication approach
    console.log("Trying with self-signed token...");
    let openai;
    try {
      openai = new OpenAI({
        baseURL: "https://api.near.ai/v1",
        apiKey: `Bearer ${authJSON}`,
      });
    } catch (err) {
      console.error("Error initializing OpenAI client:", err);
      return NextResponse.json({ result: "Error connecting to AI service. Please try again later." });
    }
    
    // Create thread with initial message parameters
    let thread;
    try {
      console.log("Creating thread with initial message...");
      thread = await openai.beta.threads.create();
      console.log("Thread created successfully:", thread.id);
    } catch (err) {
      console.error("Error creating thread:", err);
      return NextResponse.json({ result: "Unable to start AI verification process. Please try again later." });
    }

    let message;
    try {
      message = await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: messageContent
        }
      );
    } catch (err) {
      console.error("Error creating message:", err);
      // Continue with the process even if message creation fails
    }
    
    console.log("Running assistant...");
    // Run the assistant
    let run;
    try {
      const assistant_id = "commchain.near/completions/latest";
      run = await openai.beta.threads.runs.createAndPoll(
        thread.id,
        { assistant_id }
      );
      
      console.log("Run completed with status:", run.status);
    } catch (err) {
      console.error("Error running assistant:", err);
      return NextResponse.json({ result: "AI verification process encountered an error. Please try again later." });
    }
    
    // Get the response
    if (run && run.status === 'completed') {
      try {
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
      } catch (err) {
        console.error("Error retrieving messages:", err);
        return NextResponse.json({ result: "AI verification completed but couldn't retrieve the response. Please try again." });
      }
      // Return a default response
      return NextResponse.json({ result: "Received non-text response from AI verification" });
    }
    
    return NextResponse.json({ result: run ? `AI verification process status: ${run.status}` : "AI verification process status unknown" });
  } catch (error) {
    console.error("Server-side AI verification error:", error);
    const openAIError = error as OpenAIError;
    // Log full error details
    if (openAIError.response) {
      console.error("Response data:", openAIError.response.data);
      console.error("Response status:", openAIError.response.status);
      console.error("Response headers:", openAIError.response.headers);
    }
    
    // Instead of returning an error status, return a user-friendly message
    return NextResponse.json(
      { result: "AI verification encountered an unexpected error. Please try again later." },
      { status: 200 } // Return 200 OK even for errors
    );
  }
} 