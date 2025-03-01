'use client';

import { useNearWallet } from '../contexts/NearWalletSelectorContext';
import Image from 'next/image';

export default function LoginPage() {
  const { signIn } = useNearWallet();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#110c1a] text-white p-4">
      <div className="w-full max-w-md p-6 bg-[#1a1328] rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 relative mr-3">
            <Image 
              src="/logo.svg" 
              alt="CommChain Logo" 
              width={48} 
              height={48}
            />
          </div>
          <h1 className="text-3xl font-bold font-segoe">commchain</h1>
        </div>
        
        <h2 className="text-xl font-segoe text-center mb-4">Precision Field Operations Platform</h2>
        
        <p className="text-gray-300 mb-6 text-center">
          Connect your NEAR wallet to access the CommChain platform for coordinating and monitoring field operations with precision and accountability.
        </p>
        
        <div className="bg-[#281e3c] p-4 rounded-lg mb-6">
          <h3 className="font-segoe font-semibold text-[#ff6b35] mb-3">What you can do with CommChain:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#ff6b35] mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Create and assign operational tasks with detailed requirements</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#ff6b35] mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Fulfill orders and upload evidence of task completion</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#ff6b35] mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Earn TAG tokens and NFT awards for successful operations</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#ff6b35] mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Monitor real-time progress with geospatial tracking</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#ff6b35] mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Receive alerts and notifications for critical updates</span>
            </li>
          </ul>
        </div>
        
        <button
          onClick={signIn}
          className="w-full bg-[#ff6b35] hover:bg-[#ff8255] text-white font-segoe py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          <span className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
          </span>
          Connect NEAR Wallet
        </button>

        <div className="mt-5 text-xs text-center text-gray-500">
          <p>Secured by NEAR Protocol blockchain technology.</p>
          <p className="mt-1">All operations are transparent, verifiable, and immutable.</p>
        </div>
      </div>
    </div>
  );
} 