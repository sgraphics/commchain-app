'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

export default function AppLayout() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if the screen is mobile size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  return (
    <div className="app-layout flex h-screen bg-[#13111a] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar isMobile={isMobile} />
      
      {/* Main content area */}
      <div className="flex-grow overflow-hidden">
        <ChatArea />
      </div>
    </div>
  );
} 