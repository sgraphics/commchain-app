'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  selector: any;
  modal: any;
  accountId: string | null;
  signIn: () => void;
  signOut: () => void;
  contract: TaskCompletionContract | null;
}

const NearWalletContext = createContext<NearWalletContextValue>({
  selector: null,
  modal: null,
  accountId: null,
  signIn: () => {},
  signOut: () => {},
  contract: null,
});

export const useNearWallet = () => useContext(NearWalletContext);

export const NearWalletSelectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selector, setSelector] = useState<any>(null);
  const [modal, setModal] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [contract, setContract] = useState<TaskCompletionContract | null>(null);

  useEffect(() => {
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

      // Create contract interface if user is signed in
      if (state.accounts.length > 0) {
        // Use double type assertion to bypass TypeScript's type checking
        const wallet = await selector.wallet() as unknown as any;
        const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'task-completion.testnet';
        
        // Create contract interface
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

  const signIn = () => {
    modal.show();
  };

  const signOut = async () => {
    if (selector) {
      const wallet = await selector.wallet();
      await wallet.signOut();
      setAccountId(null);
      setContract(null);
    }
  };

  return (
    <NearWalletContext.Provider value={{ selector, modal, accountId, signIn, signOut, contract }}>
      {children}
    </NearWalletContext.Provider>
  );
}; 