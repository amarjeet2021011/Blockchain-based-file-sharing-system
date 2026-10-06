import addresses from "../contract/addresses.json";

export const CHAINS = {
  31337: {
    chainId: "0x7a69",
    chainName: "Hardhat Local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
  },
  11155111: {
    chainId: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

export function getContractAddress(chainId) {
  return import.meta.env.VITE_CONTRACT_ADDRESS || addresses[String(chainId)] || null;
}

export function supportedChainIds() {
  return Object.keys(addresses).map(Number);
}

export function chainName(chainId) {
  return CHAINS[chainId]?.chainName ?? `Chain ${chainId}`;
}

export async function switchChain(chainId) {
  const params = CHAINS[chainId];
  const hexId = params?.chainId ?? `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    if (err.code === 4902 && params) {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [params] });
    } else {
      throw err;
    }
  }
}
