'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import LoginPage from './LoginPage';
import { useNearWallet } from '../contexts/NearWalletSelectorContext';

export default function AppLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const { accountId } = useNearWallet();
  
  // Check if the screen is mobile size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // If not signed in, show login page
  if (!accountId) {
    return <LoginPage />;
  }
  
  // Otherwise, show the main app
  return (
    <div className="app-layout flex h-screen bg-[#110c1a] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar isMobile={isMobile} />
      
      {/* Main content area */}
      <div className="flex-grow overflow-hidden">
        <ChatArea />
      </div>
    </div>
  );
} 