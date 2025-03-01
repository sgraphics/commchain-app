import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useNearWallet } from '../contexts/NearWalletSelectorContext';

// Dynamically import the Map component with no SSR
const Map = dynamic(() => import('./Map'), { ssr: false });

interface SidebarProps {
  isMobile: boolean;
}

export default function Sidebar({ isMobile }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const { accountId, signOut } = useNearWallet();
  
  // Automatically collapse on mobile
  useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

  return (
    <div className={`sidebar bg-[#1a1328] text-white transition-all duration-300 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'} ${isMapFullscreen ? 'w-full h-full absolute z-50' : ''}`}>
      {/* Logo and user info */}
      <div className="flex items-center p-4 justify-between">
        {!isCollapsed && (
          <div className="flex items-center">
            <Image src="/logo.svg" alt="CommChain Logo" width={32} height={32} />
            <span className="ml-2 text-xl font-semibold">CommChain</span>
          </div>
        )}
        {isCollapsed && (
          <Image src="/logo.svg" alt="CommChain Logo" width={32} height={32} className="mx-auto" />
        )}
      </div>
      
      {/* User account and logout link */}
      {!isCollapsed && accountId && (
        <div className="px-4 py-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm truncate max-w-[70%]" title={accountId}>
              {accountId}
            </span>
            <button 
              onClick={signOut}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              log-out
            </button>
          </div>
        </div>
      )}
      {isCollapsed && accountId && (
        <div className="px-2 py-2 border-b border-[#281e3c] mb-2 flex justify-center">
          <button 
            onClick={signOut}
            title={`Log out ${accountId}`}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Stats Section */}
      <div className={`stats-section mt-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {!isCollapsed ? (
          <>
            <div className="bg-[#ffddd0] rounded-lg p-3 mb-2 text-black">
              <div className="flex justify-between items-center">
                <span className="text-sm font-segoe">Awards</span>
                <span className="font-bold">32 NFTs</span>
              </div>
            </div>
            <div className="bg-[#ffddd0] rounded-lg p-3 text-black">
              <div className="flex justify-between items-center">
                <span className="text-sm font-segoe">Rewards</span>
                <span className="font-bold">12 323 TAG</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-[#ffddd0] rounded-lg p-2 mb-2 w-full flex justify-center text-black">
              <span className="font-bold text-xs">32</span>
            </div>
            <div className="bg-[#ffddd0] rounded-lg p-2 w-full flex justify-center text-black">
              <span className="font-bold text-xs">12K</span>
            </div>
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="tasks-section mt-6">
        <h2 className={`text-gray-400 ${isCollapsed ? 'text-center text-xs mb-2' : 'px-4 mb-3'} font-segoe`}>
          {isCollapsed ? 'Tasks' : 'Tasks'}
        </h2>
        <div className={`task-list ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-[#281e3c] rounded-lg p-3 mb-2 flex items-center justify-between">
              {!isCollapsed && (
                <>
                  <div>
                    <div className="font-medium font-segoe">Demine Kursk region</div>
                    <div className="text-xs text-gray-400">Demine Kursk region</div>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">6</span>
                    <span className="text-gray-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      6
                    </span>
                  </div>
                </>
              )}
              {isCollapsed && (
                <div className="w-full flex flex-col items-center">
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center mb-1">6</span>
                  <span className="text-gray-400 text-xs flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    6
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Map section - Edge to edge, 1/3 height from bottom */}
      <div className="mt-auto w-full">
        <div className="relative w-full h-[33.333vh]">
          <div className={`w-full h-full ${isMapFullscreen ? 'fixed inset-0 z-50 h-screen' : ''}`}>
            <Map isFullscreen={isMapFullscreen} />
          </div>
          <button
            onClick={() => setIsMapFullscreen(!isMapFullscreen)}
            className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1 rounded-md z-10"
          >
            {isMapFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 