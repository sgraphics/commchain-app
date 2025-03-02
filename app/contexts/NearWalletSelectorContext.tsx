'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupSender } from '@near-wallet-selector/sender';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { Contract } from 'near-api-js';
import type { WalletSelector, AccountState } from '@near-wallet-selector/core';
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import '@near-wallet-selector/modal-ui/styles.css';
import { connect, keyStores, providers } from 'near-api-js';
import * as crypto from 'crypto';

// Define a type that includes the viewMethod
interface WalletWithViewMethod {
  viewMethod: (params: { contractId: string; method: string; args: any }) => Promise<any>;
  signAndSendTransaction: (params: any) => Promise<any>;
  // Add other methods as needed
}

// Contract interface
interface TaskCompletionContract {
  register_task: (args: { taskId: string; evidence: string }) => Promise<number>;
  validate_task: (args: { id: number; result: string }) => Promise<void>;
  get_all_tasks: () => Promise<any[]>;
  get_task: (args: { id: number }) => Promise<any>;
}

interface NearWalletContextValue {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: Array<AccountState>;
  accountId: string | null;
  contract: TaskCompletionContract | null;
  signIn: () => void;
  signOut: () => void;
  aiAuth: any | null;
  getAiAuthentication: () => Promise<boolean>;
}

export const NearWalletContext = createContext<NearWalletContextValue>({
  selector: null,
  modal: null,
  accounts: [],
  accountId: null,
  contract: null,
  signIn: () => {},
  signOut: () => {},
  aiAuth: null,
  getAiAuthentication: async () => false,
});

export const useNearWallet = () => useContext(NearWalletContext);

export const NearWalletSelectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<Array<AccountState>>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [contract, setContract] = useState<TaskCompletionContract | null>(null);
  const [aiAuth, setAiAuth] = useState<any | null>(null);
  const [aiAuthAttempted, setAiAuthAttempted] = useState(false);

  useEffect(() => {
    // This runs when component mounts after any redirect
    const init = async () => {
      const selector = await setupWalletSelector({
        network: 'testnet',
        debug: true,
        modules: [
          setupMyNearWallet(),
          setupSender(),
          setupMeteorWallet(),
        ],
      });

      const modal = setupModal(selector, {
        contractId: process.env.NEXT_PUBLIC_CONTRACT_NAME || 'task-completion.testnet',
      });

      const state = selector.store.getState();
      setAccountId(state.accounts[0]?.accountId || null);
      
      // Check if we're in the auth flow
      const urlParams = new URLSearchParams(window.location.search);
      const authFlow = urlParams.get('authFlow');
      
      // Create contract interface if user is signed in
      if (state.accounts.length > 0) {
        const setupContractForAccount = async () => {
          // Use double type assertion to bypass TypeScript's type checking
          const wallet = await selector.wallet() as unknown as any;
          const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'task-completion.testnet';
          
          const contractInstance = {
            register_task: async (args: { taskId: string; evidence: string }) => {
              const wallet = await selector.wallet();
              console.log("Registering task with wallet:", wallet);
              
              return wallet.signAndSendTransaction({
                receiverId: contractId,
                actions: [
                  {
                    type: 'FunctionCall',
                    params: {
                      methodName: 'register_task',
                      args,
                      gas: '30000000000000',
                      deposit: '0',
                    },
                  },
                ],
              });
            },
            validate_task: async (args: { id: number; result: string }) => {
              const wallet = await selector.wallet();
              
              return wallet.signAndSendTransaction({
                receiverId: contractId,
                actions: [
                  {
                    type: 'FunctionCall',
                    params: {
                      methodName: 'validate_task',
                      args,
                      gas: '30000000000000',
                      deposit: '0',
                    },
                  },
                ],
              });
            },
            get_all_tasks: async () => {
              console.log("Attempting to get all tasks...");
              try {
                // Always use direct NEAR API JS connection as a reliable approach
                console.log("Using direct NEAR API JS connection");
                const networkId = 'testnet';
                const provider = new providers.JsonRpcProvider({ url: `https://rpc.${networkId}.near.org` });
                
                const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'commchain.testnet';
                console.log("Contract ID:", contractId);
                
                const response = await provider.query({
                  request_type: 'call_function',
                  account_id: contractId,
                  method_name: 'get_all_tasks',
                  args_base64: btoa(JSON.stringify({})),
                  finality: 'optimistic',
                });
                
                console.log("Raw response from direct provider:", response);
                
                // Use double type assertion to bypass TypeScript's type checking
                const responseWithResult = response as unknown as { result: Uint8Array };
                
                // Decode the response
                const result = JSON.parse(new TextDecoder().decode(Buffer.from(responseWithResult.result)));
                console.log("Decoded tasks from direct provider:", result);
                return result;
              } catch (error) {
                console.error('Error in get_all_tasks:', error);
                return [];
              }
            },
            get_task: async (args: { id: number }) => {
              try {
                // Always use direct NEAR API JS connection
                const networkId = 'testnet';
                const provider = new providers.JsonRpcProvider({ url: `https://rpc.${networkId}.near.org` });
                
                const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'commchain.testnet';
                
                const response = await provider.query({
                  request_type: 'call_function',
                  account_id: contractId,
                  method_name: 'get_task',
                  args_base64: btoa(JSON.stringify(args)),
                  finality: 'optimistic',
                });
                
                // Use double type assertion to bypass TypeScript's type checking
                const responseWithResult = response as unknown as { result: Uint8Array };
                
                // Decode the response
                const result = JSON.parse(new TextDecoder().decode(Buffer.from(responseWithResult.result)));
                return result;
              } catch (error) {
                console.error('Error in get_task:', error);
                return null;
              }
            },
          };
          
          setContract(contractInstance as unknown as TaskCompletionContract);
          
          // After contract setup, check if we need AI auth
          if (!authFlow && !aiAuth) {
            console.log("Need AI auth, redirecting to get it...");
            // Add authFlow parameter to prevent loops
            await getAiAuthentication();
          }
        };
        
        setupContractForAccount();
      } else {
        setContract(null);
      }

      selector.store.observable.subscribe((state: any) => {
        const accounts = state.accounts || [];
        setAccountId(accounts[0]?.accountId || null);
        
        // Update contract when account changes
        if (accounts.length > 0) {
          const setupContractForAccount = async () => {
            // Use double type assertion to bypass TypeScript's type checking
            const wallet = await selector.wallet() as unknown as any;
            const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'task-completion.testnet';
            
            const contractInstance = {
              register_task: async (args: { taskId: string; evidence: string }) => {
                const wallet = await selector.wallet();
                console.log("Registering task with wallet:", wallet);
                
                return wallet.signAndSendTransaction({
                  receiverId: contractId,
                  actions: [
                    {
                      type: 'FunctionCall',
                      params: {
                        methodName: 'register_task',
                        args,
                        gas: '30000000000000',
                        deposit: '0',
                      },
                    },
                  ],
                });
              },
              validate_task: async (args: { id: number; result: string }) => {
                const wallet = await selector.wallet();
                
                return wallet.signAndSendTransaction({
                  receiverId: contractId,
                  actions: [
                    {
                      type: 'FunctionCall',
                      params: {
                        methodName: 'validate_task',
                        args,
                        gas: '30000000000000',
                        deposit: '0',
                      },
                    },
                  ],
                });
              },
              get_all_tasks: async () => {
                console.log("Attempting to get all tasks...");
                try {
                  // Always use direct NEAR API JS connection as a reliable approach
                  console.log("Using direct NEAR API JS connection");
                  const networkId = 'testnet';
                  const provider = new providers.JsonRpcProvider({ url: `https://rpc.${networkId}.near.org` });
                  
                  const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'commchain.testnet';
                  console.log("Contract ID:", contractId);
                  
                  const response = await provider.query({
                    request_type: 'call_function',
                    account_id: contractId,
                    method_name: 'get_all_tasks',
                    args_base64: btoa(JSON.stringify({})),
                    finality: 'optimistic',
                  });
                  
                  console.log("Raw response from direct provider:", response);
                  
                  // Use double type assertion to bypass TypeScript's type checking
                  const responseWithResult = response as unknown as { result: Uint8Array };
                  
                  // Decode the response
                  const result = JSON.parse(new TextDecoder().decode(Buffer.from(responseWithResult.result)));
                  console.log("Decoded tasks from direct provider:", result);
                  return result;
                } catch (error) {
                  console.error('Error in get_all_tasks:', error);
                  return [];
                }
              },
              get_task: async (args: { id: number }) => {
                try {
                  // Always use direct NEAR API JS connection
                  const networkId = 'testnet';
                  const provider = new providers.JsonRpcProvider({ url: `https://rpc.${networkId}.near.org` });
                  
                  const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'commchain.testnet';
                  
                  const response = await provider.query({
                    request_type: 'call_function',
                    account_id: contractId,
                    method_name: 'get_task',
                    args_base64: btoa(JSON.stringify(args)),
                    finality: 'optimistic',
                  });
                  
                  // Use double type assertion to bypass TypeScript's type checking
                  const responseWithResult = response as unknown as { result: Uint8Array };
                  
                  // Decode the response
                  const result = JSON.parse(new TextDecoder().decode(Buffer.from(responseWithResult.result)));
                  return result;
                } catch (error) {
                  console.error('Error in get_task:', error);
                  return null;
                }
              },
            };
            
            setContract(contractInstance as unknown as TaskCompletionContract);
          };
          
          setupContractForAccount();
        } else {
          setContract(null);
        }
      });

      setSelector(selector);
      setModal(modal);
    };

    init().catch(console.error);
  }, []);

  // Modify getAiAuthentication to use accountId instead of isSignedIn()
  const getAiAuthentication = useCallback(async () => {
    try {
      // Ensure we're in browser environment
      if (typeof window === 'undefined') {
        console.error("Cannot get AI auth: Not in browser environment");
        return false;
      }

      console.log("Obtaining AI authentication...");
      
      if (!selector) {
        console.error("Cannot get AI auth: Selector not initialized");
        return false;
      }
      
      if (!accountId) {
        console.error("Cannot get AI auth: No account ID available");
        return false;
      }
      
      console.log("Getting wallet for account:", accountId);
      const wallet = await selector.wallet();
      
      // Create a properly formatted 32-byte buffer nonce for the NEAR wallet
      const nonceBuffer = crypto.randomBytes(32);
      const nonceString = Buffer.from(nonceBuffer).toString('base64');
      const recipient = "ai.near";

      // Add authFlow parameter to current URL for callback
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('authFlow', 'ai');
      const callbackUrlString = currentUrl.toString();

      // Store both nonce and callbackUrl in sessionStorage for later retrieval
      console.log("Storing auth parameters in sessionStorage:");
      console.log("- Nonce:", nonceString.substring(0, 10) + "...");
      console.log("- Recipient:", recipient);
      console.log("- CallbackUrl:", callbackUrlString);
      sessionStorage.setItem('nearAINonce', nonceString);
      sessionStorage.setItem('nearAICallbackUrl', callbackUrlString);
      sessionStorage.setItem('nearAIRecipient', recipient);

      console.log("Requesting message signature with callback:", callbackUrlString);
      
      // Sign a message for NEAR AI
      await wallet.signMessage({
        message: "Login to NEAR AI",
        nonce: nonceBuffer,
        recipient: recipient,
        callbackUrl: callbackUrlString
      });
      
      // This won't execute immediately as the page will redirect
      return true;
    } catch (error) {
      console.error("Failed to obtain AI authentication:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [selector, accountId]); // Make sure to include accountId in dependencies

  // Modify to handle AI auth response from hash fragment
  useEffect(() => {
    if (!selector || !accountId) return;
    
    // Make sure we're in a browser environment before accessing window
    if (typeof window === 'undefined') return;
    
    // Check for authFlow parameter in query
    const urlParams = new URLSearchParams(window.location.search);
    const isAuthFlow = urlParams.get('authFlow') === 'ai';
    
    if (isAuthFlow && window.location.hash) {
      console.log("Detected return from wallet signing in hash fragment");
      
      try {
        // Extract parameters from the hash (remove the leading # character)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        console.log("Hash parameters:", Object.fromEntries(hashParams.entries()));
        
        // Get the signature, publicKey and other data from hash params
        const signature = hashParams.get('signature');
        const publicKey = hashParams.get('publicKey');
        const hashAccountId = hashParams.get('accountId');
        
        if (signature && publicKey) {
          console.log("Successfully received signature data");
          
          // Create auth object from the hash parameters
          const authObject = {
            signature,
            accountId: hashAccountId || accountId,
            publicKey,
            message: "Login to NEAR AI",
            // Retrieve the values we stored before redirecting to wallet
            nonce: sessionStorage.getItem('nearAINonce') || "",
            recipient: sessionStorage.getItem('nearAIRecipient') || "toolblox.near",
            callbackUrl: sessionStorage.getItem('nearAICallbackUrl') || ""
          };
          
          // Store the auth object
          setAiAuth(JSON.stringify(authObject));
          console.log("AI auth stored from redirect");
        }
        
        // Clean up URL parameters to prevent re-processing
        const newUrl = new URL(window.location.href);
        newUrl.search = ''; // Clear query
        newUrl.hash = '';   // Clear hash
        window.history.replaceState({}, '', newUrl.toString());
      } catch (error) {
        console.error("Error processing signature from URL hash:", error);
      }
    }
  }, [selector, accountId]);

  // Simple sign in function
  const signIn = useCallback(() => {
    if (modal) {
      modal.show();
    }
  }, [modal]);

  // Reset aiAuthAttempted when user signs out
  const signOut = async () => {
    if (selector) {
      const wallet = await selector.wallet();
      await wallet.signOut();
      setAccountId(null);
      setContract(null);
      setAiAuth(null);
      setAiAuthAttempted(false);
      // Clear from localStorage
      localStorage.removeItem('aiAuthAttempted');
    }
  };

  return (
    <NearWalletContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId,
        contract,
        signIn,
        signOut,
        aiAuth,
        getAiAuthentication,
      }}
    >
      {children}
    </NearWalletContext.Provider>
  );
}; 