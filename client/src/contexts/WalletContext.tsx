import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface WalletContextType {
  walletAddress: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    if (savedAddress) {
      setWalletAddress(savedAddress);
    }
  }, []);

  const connect = async () => {
    if (connecting) return;
    
    setConnecting(true);
    try {
      const { solana } = window as any;
      
      if (!solana?.isPhantom) {
        window.open("https://phantom.app/", "_blank");
        throw new Error("Phantom wallet not installed");
      }

      const response = await solana.connect();
      const address = response.publicKey.toString();
      
      setWalletAddress(address);
      localStorage.setItem("walletAddress", address);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    const { solana } = window as any;
    
    if (solana?.isPhantom) {
      solana.disconnect();
    }
    
    setWalletAddress(null);
    localStorage.removeItem("walletAddress");
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        connected: !!walletAddress,
        connecting,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
