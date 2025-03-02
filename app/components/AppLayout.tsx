'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import LoginPage from './LoginPage';
import { useNearWallet } from '../contexts/NearWalletSelectorContext';

export default function AppLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const { accountId, aiAuth, getAiAuthentication } = useNearWallet();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if the screen is mobile size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Check if we need AI authentication
  useEffect(() => {
    // Make sure we're in a browser environment
    if (typeof window === 'undefined') return;
    
    const checkAiAuth = async () => {
      // Check if we're currently processing a signature response
      const urlParams = new URLSearchParams(window.location.search);
      const isAuthFlow = urlParams.get('authFlow') === 'ai';
      const hasHashParams = window.location.hash.length > 1;
      
      // Only trigger authentication if:
      // 1. User is logged in
      // 2. No AI auth exists
      // 3. Not already loading
      // 4. Not currently in auth flow or processing hash parameters
      if (accountId && !aiAuth && !isLoading && !isAuthFlow && !hasHashParams) {
        console.log("User logged in but no AI auth, requesting it...");
        setIsLoading(true);
        try {
          await getAiAuthentication();
        } catch (err) {
          console.error("Failed to get AI authentication:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    checkAiAuth();
  }, [accountId, aiAuth, getAiAuthentication, isLoading]);
  
  // If not signed in, show login page
  if (!accountId) {
    return <LoginPage />;
  }
  
  // Show loading indicator while waiting for AI auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#110c1a] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Authenticating with NEAR AI...</p>
        </div>
      </div>
    );
  }
  
  // Handle task selection
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  return (
    <div className="app-layout flex h-screen bg-[#110c1a] text-white overflow-hidden">
      <Sidebar 
        isMobile={isMobile} 
        currentTaskId={selectedTaskId}
        onTaskSelect={handleTaskSelect}
      />
      <main className="flex-1 overflow-hidden">
        <ChatArea taskId={selectedTaskId} />
      </main>
    </div>
  );
} 