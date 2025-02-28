import { useState } from 'react';

export default function ChatArea() {
  const [message, setMessage] = useState('');
  
  return (
    <div className="chat-area flex flex-col h-full bg-[#13111a]">
      {/* Chat messages area */}
      <div className="messages-container flex-grow p-4 overflow-y-auto">
        {/* Empty state or messages would go here */}
        <div className="flex flex-col space-y-4">
          {/* Example message blocks - these would be dynamically generated */}
          <div className="bg-[#1e1b29] rounded-lg p-4 max-w-[80%] self-start">
            <p className="text-white">This is where chat messages would appear.</p>
          </div>
          
          <div className="bg-[#2d2a3a] rounded-lg p-4 max-w-[80%] self-end">
            <p className="text-white">Responses would look like this.</p>
          </div>
        </div>
      </div>
      
      {/* Input area */}
      <div className="input-container p-4 border-t border-gray-700">
        <div className="bg-[#1e1b29] rounded-lg p-2 flex items-end">
          {/* Upload image button */}
          <div className="upload-section flex items-center p-2 rounded-lg bg-[#ffd9c7] text-black mr-2">
            <div className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm font-segoe">Upload image</span>
              <span className="text-xs">Upload image as evidence to get it analyzed</span>
            </div>
          </div>
          
          {/* Send button */}
          <button className="bg-[#ff6b35] text-white p-2 rounded-lg ml-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 