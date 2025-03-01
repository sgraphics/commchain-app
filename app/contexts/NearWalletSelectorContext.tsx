'use client';

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import type { WalletSelector, AccountState } from '@near-wallet-selector/core';
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import '@near-wallet-selector/modal-ui/styles.css';

interface NearWalletSelectorContextValue {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: Array<AccountState>;
  accountId: string | null;
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

const NearWalletSelectorContext = React.createContext<NearWalletSelectorContextValue>({
  selector: null,
  modal: null,
  accounts: [],
  accountId: null,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
});

export const NearWalletSelectorContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<Array<AccountState>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const init = useCallback(async () => {
    try {
      // Start with just MyNearWallet to simplify
      const _selector = await setupWalletSelector({
        network: 'testnet',
        debug: true,
        modules: [setupMyNearWallet()],
      });

      const _modal = setupModal(_selector, {
        contractId: process.env.NEXT_PUBLIC_CONTRACT_ID || '',
      });

      const state = _selector.store.getState();
      setAccounts(state.accounts);
      
      _selector.store.observable.subscribe((state) => {
        setAccounts(state.accounts);
      });

      setSelector(_selector);
      setModal(_modal);
    } catch (error) {
      console.error("Error initializing wallet selector:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [init]);

  const accountId = accounts.length > 0 ? accounts[0].accountId : null;
  const isSignedIn = accounts.length > 0;

  const signIn = () => {
    if (modal) modal.show();
  };

  const signOut = async () => {
    if (!selector) return;
    
    try {
      const wallet = await selector.wallet();
      await wallet.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <NearWalletSelectorContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId,
        isSignedIn,
        signIn,
        signOut,
      }}
    >
      {!loading && children}
    </NearWalletSelectorContext.Provider>
  );
};

export function useNearWallet() {
  return useContext(NearWalletSelectorContext);
} 