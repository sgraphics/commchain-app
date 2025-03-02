"use client";

import { useState, useRef, useEffect } from 'react';
import { useNearWallet } from '../contexts/NearWalletSelectorContext';
import * as crypto from 'crypto';
import { encode as encodeBase64, decode as decodeBase64 } from '@stablelib/base64';
import { encode as encodeUTF8 } from '@stablelib/utf8';
import { uploadToStoracha } from '../utils/storacha';
import { getTaskById, Task } from '../data/mockTasks';

// Public key for encryption (store this in your .env.local as NEXT_PUBLIC_RSA_PUBLIC_KEY)
// It's safe to expose the public key
const RSA_PUBLIC_KEY = process.env.NEXT_PUBLIC_RSA_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1qxLVfXq84WpekOzuJBS
GcI5H+QHJSsr5xmNxPQTLOM7KHtw/6WRiOIQ1Ej6CuvxlxIKLcwFttWZCCEJX9vG
cidXgKzPSrm6dbjAnjYZnL32Fnf0XjyPg0e4l3z163lDWkfu2o/rzVoZDCmx1lo0
gOJaJhXhDogC/NYerjLnplAo1PLWJAY36qHiEpogL33vns2J99IyiZ/yCyPxXWgY
kD2KhCg4AVPEKjt4pWqnczaCIXBeFAQS0R4TtAJMwTUbxzdoJO4jrPAJRJ7vKyF3
iQ/oz9IHAPRdazBSmSsTS4+jEd1nSNO/+GdoOIzgxENc6KRbmvR0tyhpWbvuLC4f
PwIDAQAB
-----END PUBLIC KEY-----`;

// Task message interface
interface TaskMessage {
  id: number;
  taskId: string;
  evidence: string;
  status: string;
  user: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accountId, contract } = useNearWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load task details when taskId changes
  useEffect(() => {
    if (taskId) {
      const task = getTaskById(taskId);
      setCurrentTask(task || null);
    } else {
      setCurrentTask(null);
    }
  }, [taskId]);

  // Load tasks from the contract
  useEffect(() => {
    const loadTasks = async () => {
      console.log("ChatArea: Loading tasks...");
      console.log("Contract available:", !!contract);
      
      if (!contract) {
        console.log("No contract available, skipping task loading");
        return;
      }
      
      setIsLoading(true);
      try {
        console.log("Calling contract.get_all_tasks()");
        const allTasks = await contract.get_all_tasks();
        console.log("Received tasks:", allTasks);
        
        // Filter tasks by taskId if provided
        let filteredTasks = allTasks;
        if (taskId) {
          filteredTasks = allTasks.filter(task => task.taskId === taskId);
          console.log("Filtered tasks for taskId", taskId, ":", filteredTasks);
        }
        
        // Sort tasks by timestamp (newest first)
        const sortedTasks = filteredTasks.sort((a, b) => b.timestamp - a.timestamp);
        console.log("Sorted tasks:", sortedTasks);
        setTasks(sortedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, [contract, taskId]);  // Re-run when taskId changes

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
      console.log('Starting encryption process...');
      // Generate a random symmetric key for content encryption
      const symmetricKey = crypto.randomBytes(32);  // 32 bytes (256 bits) for AES-256
      
      // Generate an IV for AES encryption
      const iv = crypto.randomBytes(16);
      
      console.log('Encrypting data with AES...');
      // Encrypt the image with AES (symmetric encryption)
      const cipher = crypto.createCipheriv('aes-256-cbc', symmetricKey, iv);
      const encryptedData = Buffer.concat([
        cipher.update(Buffer.from(imageData)),
        cipher.final()
      ]);
      
      console.log('Encrypting symmetric key with RSA...');
      // Encrypt the symmetric key with the RSA public key
      const encryptedKey = crypto.publicEncrypt(
        {
          key: RSA_PUBLIC_KEY,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        symmetricKey
      );
      
      // Create the payload
      const payload = {
        iv: iv.toString('base64'),
        encryptedData: encryptedData.toString('base64'),
        encryptedKey: encryptedKey.toString('base64')
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
    if ((!message && !uploadedImage) || !contract || !accountId) {
      console.log("Cannot send message:", {
        hasMessage: !!message,
        hasUploadedImage: !!uploadedImage,
        hasContract: !!contract,
        hasAccountId: !!accountId
      });
      return;
    }
    
    try {
      let evidence = message;
      
      // If there's an image, encrypt and upload it
      if (uploadedImage) {
        console.log("Encrypting and uploading image...");
        const imageData = decodeBase64(uploadedImage.split(',')[1]);
        evidence = await encryptAndUploadImage(imageData);
        console.log("Image uploaded with CID:", evidence);
      }
      
      // Use the selected taskId from props or generate a new one if not provided
      const currentTaskId = taskId || `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log("Using task ID:", currentTaskId);
      
      // Register the task on the blockchain
      console.log("Registering task on blockchain...");
      const result = await contract.register_task({ taskId: currentTaskId, evidence });
      console.log("Task registration result:", result);
      
      // Clear the form
      setMessage('');
      setUploadedImage(null);
      
      // Reload tasks to show the new one
      console.log("Reloading tasks after sending message...");
      const allTasks = await contract.get_all_tasks();
      console.log("Reloaded tasks:", allTasks);
      
      // Filter tasks by taskId if provided, and sort
      let filteredTasks = taskId ? allTasks.filter(task => task.taskId === taskId) : allTasks;
      const sortedTasks = filteredTasks.sort((a, b) => b.timestamp - a.timestamp);
      setTasks(sortedTasks);
    } catch (error) {
      console.error('Error sending message:', error);
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
                className={`rounded-lg p-3 max-w-xs md:max-w-md ${
                  task.user === accountId 
                    ? 'bg-[#ff6b35] text-white' 
                    : 'bg-[#2a1e3d] text-white'
                }`}
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
                  text-xs mt-1 opacity-70
                  ${task.user === accountId ? 'text-right' : 'text-left'}
                `}>
                  {new Date(task.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-gray-700">
        {uploadedImage && (
          <div className="mb-3 relative">
            <div className="relative h-32 w-32 rounded-md overflow-hidden">
              <img 
                src={uploadedImage} 
                alt="Uploaded image" 
                className="object-cover w-full h-full"
              />
              <button 
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={currentTask ? 
              `Report for ${currentTask.name}...` : 
              "Type a message..."
            }
            className="flex-grow bg-[#2a1e3d] text-white rounded-l-lg px-4 py-2 focus:outline-none"
          />
          
          <label className="cursor-pointer bg-[#2a1e3d] text-white px-3 py-2 hover:bg-[#3a2e4d] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              ref={fileInputRef}
            />
          </label>
          
          <button
            onClick={handleSendMessage}
            disabled={(!message && !uploadedImage) || isUploading}
            className={`
              bg-[#ff6b35] text-white rounded-r-lg px-4 py-2
              ${(!message && !uploadedImage) || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#ff8c35] transition-colors'}
            `}
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}