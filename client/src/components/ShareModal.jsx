import { useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import { errorMessage } from "../lib/format";

export default function ShareModal({ contract, onClose }) {
  const [address, setAddress] = useState("");
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const entries = await contract.shareAccess();
      setList(entries.map((e) => ({ user: e.user, access: e.access })));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [contract]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      const tx = await fn();
      await tx.wait();
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function share(e) {
    e.preventDefault();
    const addr = address.trim();
    if (!isAddress(addr)) {
      setError("Enter a valid Ethereum address.");
      return;
    }
    if (await run(() => contract.allow(addr))) setAddress("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>Share access</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <p className="hint">Addresses you share with can view all of your files.</p>
        <form className="row" onSubmit={share}>
          <input
            className="grow"
            placeholder="0x… address"
            value={address}
            disabled={busy}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button className="btn primary" disabled={busy || !address.trim()}>Share</button>
        </form>
        {error && <div className="alert error">{error}</div>}

        <h3>People with access</h3>
        {list.length === 0 ? (
          <p className="hint">You haven&apos;t shared with anyone yet.</p>
        ) : (
          <ul className="access-list">
            {list.map((a) => (
              <li key={a.user}>
                <code>{a.user}</code>
                {a.access ? (
                  <button className="btn danger" disabled={busy} onClick={() => run(() => contract.disallow(a.user))}>
                    Revoke
                  </button>
                ) : (
                  <button className="btn" disabled={busy} onClick={() => run(() => contract.allow(a.user))}>
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
