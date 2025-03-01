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
      {/* Logo and burger menu */}
      <div className="flex items-center p-4 justify-between">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 relative mr-2">
              <Image 
                src="/logo.svg" 
                alt="CommChain Logo" 
                width={32} 
                height={32}
                className="text-pink-500"
              />
            </div>
            <h1 className="text-xl font-bold font-segoe">commchain</h1>
          </div>
        )}
        {!isCollapsed && accountId && (
          <div className="text-xs text-gray-400 truncate max-w-[150px] mt-1">
            {accountId}
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-gray-700"
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          )}
        </button>
      </div>

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

      {/* Map Section - Now taking 1/3 of screen height with no margins */}
      <div className="mt-auto">
        <div className={`relative w-full h-[33.333vh] ${isMapFullscreen ? 'fixed inset-0 h-screen z-50' : ''}`}>
          <Map />
          <div className="absolute bottom-2 right-2 z-10">
            <button 
              onClick={() => setIsMapFullscreen(!isMapFullscreen)}
              className="bg-white/80 text-black text-xs py-1 px-2 rounded hover:bg-white font-segoe"
            >
              {isMapFullscreen ? 'exit fullscreen' : 'full screen'}
            </button>
          </div>
        </div>
      </div>

      <div className={`mt-auto mb-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <button
          onClick={signOut}
          className={`w-full bg-[#281e3c] hover:bg-[#342a4a] text-white rounded-lg transition-colors duration-200 flex items-center justify-center ${isCollapsed ? 'py-2' : 'py-2 px-3'}`}
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign Out
            </>
          )}
        </button>
      </div>
    </div>
  );
} 