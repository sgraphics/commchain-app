"use client";

import { useState, useRef, useEffect } from 'react';
import { useNearWallet } from '../contexts/NearWalletSelectorContext';
import * as crypto from 'crypto';
import { encode as encodeBase64, decode as decodeBase64 } from '@stablelib/base64';
import { encode as encodeUTF8 } from '@stablelib/utf8';
import { uploadToStoracha } from '../utils/storacha';
import { getTaskById, taskData, Task } from '../data/mockTasks';
import OpenAI from "openai";
import nacl from 'tweetnacl';

// Public key for encryption (store this in your .env.local as NEXT_PUBLIC_RSA_PUBLIC_KEY)
// It's safe to expose the public key
const RSA_PUBLIC_KEY = process.env.NEXT_PUBLIC_RSA_PUBLIC_KEY || "";

// Task message interface
interface TaskMessage {
  id: number;
  taskId: string;
  evidence: string;
  status: number;
  user: string;
  result: string;
  timestamp: number;
}

// Add taskId to props
interface ChatAreaProps {
  taskId?: string;
}

export default function ChatArea({ taskId }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tasks, setTasks] = useState<TaskMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accountId, contract, selector, aiAuth } = useNearWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load task details when taskId changes
  useEffect(() => {
    if (taskId) {
      const task = getTaskById(taskId);
      setCurrentTask(task || null);
    } else {
      setCurrentTask(null);
    }
  }, [taskId]);

  // Function to load tasks from the contract
  const loadTasks = async () => {
    console.log("ChatArea: Loading tasks...");
    
    if (!contract) {
      console.log("No contract available, skipping task loading");
      return;
    }
    
    try {
      console.log("Calling contract.get_all_tasks()");
      const allTasks = await contract.get_all_tasks();
      console.log("Received tasks:", allTasks);
      
      // Filter tasks by ID > 54 first
      const idFilteredTasks = allTasks.filter(task => task.id > 54);
      console.log("Tasks filtered by ID > 54:", idFilteredTasks);
      
      // Then filter by taskId if provided
      let filteredTasks = idFilteredTasks;
      if (taskId) {
        filteredTasks = idFilteredTasks.filter(task => task.taskId === taskId);
        console.log("Filtered tasks for taskId", taskId, ":", filteredTasks);
      }
      
      // Sort tasks by timestamp (newest first)
      const sortedTasks = filteredTasks.sort((a, b) => b.timestamp - a.timestamp);
      console.log("Sorted tasks:", sortedTasks);
      setTasks(sortedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Initial load of tasks
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      await loadTasks();
      setIsLoading(false);
    };
    
    initialLoad();
    
    // Set up polling interval
    pollingIntervalRef.current = setInterval(loadTasks, 5000);
    
    // Clean up interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [contract, taskId]);  // Re-run when contract or taskId changes

  // Scroll to bottom when new tasks are loaded
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tasks]);

  // Function to handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Function to encrypt and upload image
  async function encryptAndUploadImage(imageData: Uint8Array): Promise<string> {
    try {
      console.log('Starting asymmetric encryption process with NaCl Box...');
      
      // Get the server's public key from environment
      const publicKeyBase64 = process.env.NEXT_PUBLIC_ENCRYPTION_PUBLIC_KEY || "YOUR_PUBLIC_KEY_BASE64";
      
      // Decode the base64 public key
      let publicKey: Uint8Array;
      if (publicKeyBase64.startsWith('b64:')) {
        publicKey = decodeBase64(publicKeyBase64.substring(4));
      } else {
        throw new Error('Invalid public key format - must start with b64:');
      }
      
      // Generate a ephemeral keypair for this encryption
      const ephemeralKeyPair = nacl.box.keyPair();
      
      // Generate a random nonce
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      
      console.log('Encrypting data with NaCl box...');
      // Create a box with our ephemeral secret key and the server's public key
      const encryptedData = nacl.box(
        imageData,
        nonce,
        publicKey,
        ephemeralKeyPair.secretKey
      );
      
      // Create the payload, including our ephemeral public key
      const payload = {
        nonce: encodeBase64(nonce),
        encryptedData: encodeBase64(encryptedData),
        senderPublicKey: encodeBase64(ephemeralKeyPair.publicKey)
      };
      
      // Serialize and upload
      const payloadBytes = encodeUTF8(JSON.stringify(payload));
      console.log('Payload created, size:', payloadBytes.length);
      
      const formData = new FormData();
      const encryptedBlob = new Blob([payloadBytes], { type: 'application/octet-stream' });
      formData.append('file', encryptedBlob, 'encrypted-image.bin');
      
      console.log('Sending upload request to /api/upload...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Upload success, result:', result);
      return `storj-${result.cid}`;
    } catch (error) {
      console.error('Error encrypting and uploading image:', error);
      throw error;
    }
  }

  // Function to handle sending a message
  const handleSendMessage = async () => {
    // Check if we need a photo but don't have one
    const needsPhoto = currentTask?.template?.includes('PHOTO');
    const needsCount = currentTask?.template?.includes('COUNT');
    
    // Validate requirements based on template
    if ((needsPhoto && !uploadedImage) || !contract || !accountId) {
      return;
    }
    
    try {
      setIsUploading(true);
      let evidence = '';
      
      // If there's an image and we need one, encrypt and upload it
      if (uploadedImage && needsPhoto) {
        console.log("Encrypting and uploading image...");
        const imageData = decodeBase64(uploadedImage.split(',')[1]);
        evidence = await encryptAndUploadImage(imageData);
        console.log("Image uploaded with CID:", evidence);
      }

      if (!currentTask) {
        console.error("Cannot register task: currentTask is null");
        throw new Error("No task selected");
      }
      
      // Register the task with the evidence CID and count if needed
      console.log("Registering task on blockchain...");
      const registerParams = { 
        taskId: currentTask.id, 
        evidence: evidence, // The IPFS image ID
        count: needsCount ? itemCount : undefined // Only include count if needed
      };
      
      // Call the contract to register the task
      const taskId = await contract.register_task(registerParams);
      console.log("Task registration result:", taskId);
      
      // Clear the form immediately to allow user to continue
      setUploadedImage(null);
      setItemCount(0);
      
      // Reload tasks to show the new submission
      const allTasks = await contract.get_all_tasks();
      // Filter by ID > 54 first
      const idFilteredTasks = allTasks.filter(task => task.id > 54);
      // Then filter by taskId if needed
      let filteredTasks = currentTask ? idFilteredTasks.filter(task => task.taskId === currentTask.id) : idFilteredTasks;
      const sortedTasks = filteredTasks.sort((a, b) => b.timestamp - a.timestamp);
      setTasks(sortedTasks);
      
      // Start AI verification in the background if needed - don't await this
      if (currentTask?.ai_verification_instructions) {
        console.log("Starting AI verification process in background");
        startAIVerification(currentTask, evidence, itemCount, taskId, aiAuth)
          .then((result) => {
            console.log("AI verification completed:", result);
          })
          .catch((error) => {
            console.error("AI verification failed:", error);
          });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Separate function to handle AI verification in the background
  const startAIVerification = async (
    task: Task, 
    evidence: string, 
    count: number, 
    taskId: number,
    authToken: string | null
  ): Promise<string> => {
    try {
      console.log("Getting AI verification with instructions:", task.ai_verification_instructions);
      
      if (!authToken) {
        console.log("No AI auth token available - user may need to re-login to get AI verification");
        return "AI verification skipped - please log out and log back in to enable AI verification";
      }
      
      // Call our server-side API instead of directly using OpenAI
      const response = await fetch('/api/ai-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          blockchainId: taskId.toString(), // Pass the blockchain task ID
          authToken: authToken,
          count: task.template.includes('COUNT') ? count : undefined // Only include count if needed
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI verification API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`AI service error: ${data.error}`);
      }
      
      return data.result;
    } catch (error) {
      console.error("Error during AI verification:", error);
      return "Error during AI verification: " + (error instanceof Error ? error.message : String(error));
    }
  };

  // Function to remove the uploaded image
  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to render task details
  const renderTaskDetails = () => {
    if (!currentTask) return null;

    return (
      <div className="p-4">
        <div className="bg-[#1a1328] rounded-2xl overflow-hidden" style={{borderRadius: '15px'}}>
          {/* Task content - simple flex layout */}
          <div className="flex flex-row">
            {/* Left side - task description */}
            <div className="p-4 flex-1">
              <h2 className="text-xl font-semibold">{currentTask.name}</h2>
              <div className="text-sm text-gray-400 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {currentTask.location}
              </div>
              <p className="text-sm mt-4">{currentTask.instructions}</p>
            </div>

            {/* Right side - reward and verifiers */}
            <div className="p-4 flex flex-col items-end">
              {/* Only show the badge if we have either rewards or verifiers */}
              {(currentTask.reward_usdc || currentTask.ai_verification_instructions || currentTask.human_verification_instructions) && (
                <div className="bg-[#281e3c] rounded-2xl flex items-center" style={{borderRadius: '15px'}}>
                  {/* Reward amount and unit - only if reward exists */}
                  {currentTask.reward_usdc && (
                    <div className="flex flex-col items-start px-4 py-3">
                      <div className="text-3xl">
                        {currentTask.reward_usdc} USDC
                      </div>
                      <div className="text-sm text-gray-400">
                        per item
                      </div>
                    </div>
                  )}

                  {/* Verifier section - only if any verification type exists */}
                  {(currentTask.ai_verification_instructions || currentTask.human_verification_instructions) && (
                    <div className="flex flex-col items-center px-4 py-3 border-l border-gray-700">
                      <div className="w-6 h-6">
                        {currentTask.ai_verification_instructions ? (
                          // AI verifier icon
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="12" cy="14" r="2"></circle>
                            <path d="M8 8h.01M16 8h.01"></path>
                          </svg>
                        ) : currentTask.human_verification_instructions ? (
                          // Human verifier icon
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        verifiers
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Task Details Panel */}
      {currentTask ? renderTaskDetails() : (
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Field Operations</h2>
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            {currentTask ? 'No reports for this task yet. Send a message to create one.' : 'No tasks yet. Send a message to create one.'}
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              className={`flex ${task.user === accountId ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div 
                className={`rounded-lg p-3 max-w-xs md:max-w-md bg-[#ffddd0] text-black`}
              >
                {/* If evidence looks like a CID, show image placeholder with download link */}
                {task.evidence.startsWith('storj-') ? (
                  <div className="mb-2">
                    <a 
                      href={`/api/decrypt?cid=${encodeURIComponent(task.evidence)}`} 
                      download={`encrypted-image-${task.id}.jpg`}
                      className="block"
                    >
                      <div className="bg-gray-700 rounded-md p-2 flex items-center justify-center h-40 w-full hover:bg-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </div>
                      <div className="mt-1 text-sm opacity-70">Encrypted Image (Click to Download)</div>
                    </a>
                  </div>
                ) : (
                  <p>{task.evidence}</p>
                )}
                
                <div className={`
                  text-xs mt-1 opacity-70 flex items-center
                  ${task.user === accountId ? 'justify-end' : 'justify-start'}
                `}>
                  {/* Status indicator */}
                  <div className="flex items-center mr-2">
                    {task.status === 0 ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-black mr-1"></div>
                        <span>Pending (id: {task.id})</span>
                      </>
                    ) : task.status === 1 ? (
                      <>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-red-600">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span className="text-red-600">Rejected</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Show verification result if available */}
                {task.status === 1 && task.result && (
                  <div className="mt-2 pt-2 border-t border-black/20 text-sm">
                    <div className="flex justify-end">
                      <div>
                        <span>Result: </span>
                        {currentTask?.template?.includes('COUNT') ? (
                          <span className="font-semibold">{task.result} item(s)</span>
                        ) : (
                          <span className="font-semibold">
                            {task.result.trim() === "1" ? "accepted" : "rejected"}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Reward button for verified tasks with non-zero result and available reward */}
                    {task.status === 1 && task.result !== "0" && currentTask?.reward_usdc && (
                      <div className="flex justify-end">
                        <button 
                          style={{padding: '5px 10px', marginTop: '10px'}}
                          onClick={() => alert("Rewarding not yet implemented")}
                          className="mt-2 bg-[#ff8f74] hover:bg-[#ff6b35] text-black px-3 py-1 rounded-md text-sm font-medium"
                        >
                          Reward
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Bottom input panel */}
      <div className="p-4">
        <div className="bg-[#ffddd0] rounded-2xl p-4 text-black" style={{borderRadius: '15px'}}>
          <div className="flex justify-between items-center">
            {/* Left side - text */}
            <div>
              <div className="text-sm font-medium">
                {currentTask?.template === 'PHOTO' && 'Upload image as evidence'}
                {currentTask?.template === 'COUNT' && 'Specify item count'}
                {currentTask?.template === 'PHOTO_AND_COUNT' && 'Upload image and specify item count'}
                {currentTask?.template === 'CHECK' && 'Confirm task completion'}
              </div>
              <div className="text-xs text-gray-600">
                {currentTask?.template?.includes('PHOTO') && 'Upload image as evidence to get it analyzed'}
                {currentTask?.template === 'COUNT' && 'Enter the count of items for verification'}
                {currentTask?.template === 'CHECK' && 'Confirm that you have completed this task'}
              </div>
            </div>
            
            {/* Right side - controls, all in one row */}
            <div className="flex items-center space-x-2">
              {currentTask?.template?.includes('COUNT') && (
                <>
                  <button 
                    style={{border: '1px solid #000000', width: '40px', height: '40px'}}
                    onClick={() => setItemCount(Math.max(0, itemCount - 1))}
                    className="bg-white p-2 hover:bg-gray-100 text-black rounded-lg flex items-center justify-center"
                  >
                    -
                  </button>
                  
                  <div className="bg-white text-black rounded-lg flex items-center justify-center"
                    style={{border: '1px solid #000000', width: '40px', height: '40px', margin: '0px 10px', backgroundColor: '#ffffff'}}
                  >
                    {itemCount}
                  </div>
                  
                  <button 
                    style={{border: '1px solid #000000', width: '40px', height: '40px'}}
                    onClick={() => setItemCount(itemCount + 1)}
                    className="bg-white hover:bg-gray-100 text-black w-10 h-10 rounded-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </>
              )}
              
              {/* File input element (hidden) */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                ref={fileInputRef}
              />
              
              {/* Upload/thumbnail button - only show when template includes PHOTO */}
              {currentTask?.template?.includes('PHOTO') && (
                uploadedImage ? (
                  <>
                    {/* Thumbnail preview when image is selected */}
                    <div 
                      style={{border: '1px solid #000000', width: '40px', height: '40px', margin: '0px 10px'}}
                      className="relative bg-white rounded-lg overflow-hidden"
                    >
                      <img 
                        src={uploadedImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Remove button */}
                    <button
                      onClick={handleRemoveImage}
                      style={{height: '40px',  margin: '0px 10px',border: '1px solid #000000'}}
                      className="bg-[#ff8f74] hover:bg-[#ff6b35] text-black h-10 px-4 rounded-lg"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  /* Upload button when no image is selected */
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{height: '40px', backgroundColor: '#ff8f74', margin: '0px 10px'}}
                    className="bg-[#ff8f74] hover:bg-[#ff6b35] text-black h-10 px-4 rounded-lg"
                  >
                    Upload
                  </button>
                )
              )}
              
              {/* Send button */}
              <button
                onClick={handleSendMessage} 
                disabled={
                  !currentTask || 
                  !accountId || 
                  (currentTask.template.includes('PHOTO') && !uploadedImage)
                }
                style={{
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: (!currentTask || !accountId || (currentTask.template.includes('PHOTO') && !uploadedImage)) 
                    ? '#cccccc' 
                    : '#ff8f74'
                }}
                className={`${
                  (!currentTask || !accountId || (currentTask.template.includes('PHOTO') && !uploadedImage))
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#ff8f74] hover:bg-[#ff6b35] cursor-pointer'
                } text-black w-10 h-10 rounded-lg flex items-center justify-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}