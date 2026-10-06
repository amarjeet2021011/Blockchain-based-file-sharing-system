import { useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import { toGatewayUrl } from "../lib/ipfs";
import { errorMessage, shortAddress } from "../lib/format";

export default function Display({ contract, account, refreshKey }) {
  const [owner, setOwner] = useState(account);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [shared, setShared] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setOwner(account), [account]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, grantors] = await Promise.all([contract.display(owner), contract.sharedWithMe()]);
      setFiles(list.map((f) => ({ url: f.url, fileType: f.fileType, fileName: f.fileName, uploadedAt: Number(f.uploadedAt) })));
      setShared(grantors);
    } catch (err) {
      setFiles([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [contract, owner]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function viewOther(e) {
    e.preventDefault();
    const addr = input.trim();
    if (!isAddress(addr)) {
      setError("Enter a valid Ethereum address.");
      return;
    }
    setOwner(addr);
  }

  const isMine = owner?.toLowerCase() === account?.toLowerCase();

  return (
    <section className="panel">
      <div className="row between">
        <h2>{isMine ? "My files" : `Files of ${shortAddress(owner)}`}</h2>
        <div className="row">
          {!isMine && <button className="btn" onClick={() => setOwner(account)}>Back to my files</button>}
          <button className="btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      <form className="row" onSubmit={viewOther}>
        <input
          className="grow"
          placeholder="View files of another address (0x…)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn">View</button>
      </form>

      {shared.length > 0 && (
        <div className="shared">
          <span className="label">Shared with me:</span>
          {shared.map((a) => (
            <button key={a} className="chip" title={a} onClick={() => setOwner(a)}>{shortAddress(a)}</button>
          ))}
        </div>
      )}

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <p className="hint">Loading…</p>
      ) : !error && files.length === 0 ? (
        <p className="hint">No files yet.</p>
      ) : (
        <div className="files">
          {files.map((f, i) => {
            const href = toGatewayUrl(f.url);
            return (
              <a key={i} className="file" href={href} target="_blank" rel="noreferrer" title={f.url}>
                {f.fileType.startsWith("image/") ? (
                  <img src={href} alt={f.fileName} loading="lazy" />
                ) : (
                  <div className="file-icon">{(f.fileName.split(".").pop() || "file").slice(0, 4).toUpperCase()}</div>
                )}
                <div className="file-name">{f.fileName}</div>
                <div className="file-meta">{new Date(f.uploadedAt * 1000).toLocaleString()}</div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
