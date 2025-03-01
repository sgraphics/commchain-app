import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useNearWallet } from '../contexts/NearWalletSelectorContext';
import * as nacl from 'tweetnacl';
import { encode as encodeBase64, decode as decodeBase64 } from '@stablelib/base64';
import { encode as encodeUTF8 } from '@stablelib/utf8';

// Public key for encryption (in a real app, this would be fetched from a secure source)
const ENCRYPTION_PUBLIC_KEY = 'IHtfJLU2b0vZKhA+9GxOKjCs0CyJi8xSRpZiXSK3cQg=';

// Task interface
interface Task {
  id: number;
  taskId: string;
  evidence: string;
  status: string;
  user: string;
  timestamp: number;
}

export default function ChatArea() {
  const [message, setMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accountId, contract } = useNearWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        
        // Sort tasks by timestamp (newest first)
        const sortedTasks = allTasks.sort((a, b) => b.timestamp - a.timestamp);
        console.log("Sorted tasks:", sortedTasks);
        setTasks(sortedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
        // Don't set mock data, just show an empty state
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, [contract]);

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
  const encryptAndUploadImage = async (imageDataUrl: string): Promise<string> => {
    setIsUploading(true);
    try {
      // Extract base64 data from data URL
      const base64Data = imageDataUrl.split(',')[1];
      const imageData = decodeBase64(base64Data);
      
      // Convert public key from base64 to Uint8Array
      const publicKey = decodeBase64(ENCRYPTION_PUBLIC_KEY);
      
      // Generate a one-time symmetric key
      const symmetricKey = nacl.randomBytes(nacl.secretbox.keyLength);
      
      // Encrypt the image data with the symmetric key
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      const encryptedData = nacl.secretbox(imageData, nonce, symmetricKey);
      
      // Encrypt the symmetric key with the public key
      const encryptedKey = nacl.box.before(symmetricKey, publicKey);
      
      // Combine everything into a single payload
      const payload = {
        nonce: encodeBase64(nonce),
        encryptedData: encodeBase64(encryptedData),
        encryptedKey: encodeBase64(encryptedKey)
      };
      
      // Upload to Storj/Storacha (mocked for now)
      // In a real implementation, you would use the Storj/Storacha API here
      console.log('Uploading encrypted data to storage...');
      
      // Mock API call to Storj/Storacha
      const response = await new Promise<{cid: string}>((resolve) => {
        setTimeout(() => {
          resolve({ cid: `storj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` });
        }, 1500);
      });
      
      return response.cid;
    } catch (error) {
      console.error('Error encrypting and uploading image:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

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
        evidence = await encryptAndUploadImage(uploadedImage);
        console.log("Image uploaded with CID:", evidence);
      }
      
      // Generate a unique task ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log("Generated task ID:", taskId);
      
      // Register the task on the blockchain
      console.log("Registering task on blockchain...");
      const result = await contract.register_task({ taskId, evidence });
      console.log("Task registration result:", result);
      
      // Clear the form
      setMessage('');
      setUploadedImage(null);
      
      // Reload tasks to show the new one
      console.log("Reloading tasks after sending message...");
      const allTasks = await contract.get_all_tasks();
      console.log("Reloaded tasks:", allTasks);
      const sortedTasks = allTasks.sort((a, b) => b.timestamp - a.timestamp);
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold">Field Operations</h2>
      </div>
      
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            No tasks yet. Send a message to create one.
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
                
                <div className={`text-xs mt-1 ${task.user === accountId ? 'text-white/70' : 'text-gray-400'}`}>
                  <span className="font-semibold">Status: {task.status}</span>
                  <span className="ml-2">
                    {new Date(task.timestamp).toLocaleTimeString()} by {task.user.split('.')[0]}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-gray-700">
        {/* Image preview */}
        {uploadedImage && (
          <div className="relative mb-2 inline-block">
            <img 
              src={uploadedImage} 
              alt="Upload preview" 
              className="h-20 rounded-md object-cover"
            />
            <button 
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Message input */}
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-grow bg-[#2a1e3d] text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isUploading}
          />
          
          {/* Image upload button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#2a1e3d] text-white p-2 rounded-lg"
            disabled={isUploading}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageSelect}
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          
          {/* Send button */}
          <button 
            className={`${isUploading ? 'bg-gray-500' : 'bg-[#ff6b35]'} text-white p-2 rounded-lg ml-auto`}
            onClick={handleSendMessage}
            disabled={isUploading}
          >
            {isUploading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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