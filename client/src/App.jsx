import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import UploadArtifact from "./contract/Upload.json";
import { chainName, getContractAddress, supportedChainIds, switchChain } from "./lib/chains";
import { errorMessage, shortAddress } from "./lib/format";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import ShareModal from "./components/ShareModal";

export default function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sync = useCallback(async (requestAccounts) => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send(requestAccounts ? "eth_requestAccounts" : "eth_accounts", []);
      const { chainId } = await provider.getNetwork();
      const id = Number(chainId);
      setChainId(id);

      if (!accounts.length) {
        setAccount(null);
        setContract(null);
        return;
      }
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());

      const address = getContractAddress(id);
      if (address && (await provider.getCode(address)) !== "0x") {
        setContract(new Contract(address, UploadArtifact.abi, signer));
        setError("");
      } else {
        setContract(null);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    sync(false);
    const reload = () => sync(false);
    window.ethereum.on("accountsChanged", reload);
    window.ethereum.on("chainChanged", reload);
    return () => {
      window.ethereum.removeListener("accountsChanged", reload);
      window.ethereum.removeListener("chainChanged", reload);
    };
  }, [sync]);

  const supported = supportedChainIds();

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>File Securita</h1>
          <p className="subtitle">Decentralized file sharing on Ethereum + IPFS</p>
        </div>
        <div className="wallet">
          {chainId && <span className="badge">{chainName(chainId)}</span>}
          {account ? (
            <span className="badge account" title={account}>{shortAddress(account)}</span>
          ) : (
            window.ethereum && (
              <button className="btn primary" onClick={() => sync(true)}>Connect MetaMask</button>
            )
          )}
          {contract && (
            <button className="btn" onClick={() => setShareOpen(true)}>Share</button>
          )}
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      {!window.ethereum ? (
        <div className="panel center">
          <h2>MetaMask not found</h2>
          <p>
            Install the <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">MetaMask</a>{" "}
            browser extension and reload this page.
          </p>
        </div>
      ) : !account ? (
        <div className="panel center">
          <h2>Connect your wallet</h2>
          <p>Connect MetaMask to upload files and manage who can see them.</p>
        </div>
      ) : !contract ? (
        <div className="panel center">
          <h2>Contract not deployed on {chainName(chainId)}</h2>
          <p>Deploy the contract to this network or switch to a network where it is deployed.</p>
          <div className="row center">
            {supported.filter((id) => id !== chainId).map((id) => (
              <button key={id} className="btn" onClick={() => switchChain(id).catch((e) => setError(errorMessage(e)))}>
                Switch to {chainName(id)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <FileUpload contract={contract} onUploaded={() => setRefreshKey((k) => k + 1)} />
          <Display contract={contract} account={account} refreshKey={refreshKey} />
        </>
      )}

      {shareOpen && contract && <ShareModal contract={contract} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
