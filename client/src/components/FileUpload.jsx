import { useState } from "react";
import { isPinataConfigured, uploadToPinata } from "../lib/ipfs";
import { errorMessage } from "../lib/format";

export default function FileUpload({ contract, onUploaded }) {
  const [file, setFile] = useState(null);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pinata = isPinataConfigured();

  async function save(url, fileType, fileName) {
    setStatus("Confirm the transaction in MetaMask…");
    const tx = await contract.add(url, fileType, fileName);
    setStatus("Waiting for confirmation…");
    await tx.wait();
    onUploaded();
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setStatus("Uploading to IPFS via Pinata…");
      const url = await uploadToPinata(file);
      await save(url, file.type || "application/octet-stream", file.name);
      setFile(null);
      e.target.reset();
      setStatus("File uploaded.");
    } catch (err) {
      setStatus("");
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddLink(e) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setBusy(true);
    setError("");
    try {
      const url = linkUrl.trim();
      await save(url, "link", linkName.trim() || url);
      setLinkName("");
      setLinkUrl("");
      setStatus("Link added.");
    } catch (err) {
      setStatus("");
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Upload</h2>
      <div className="upload-grid">
        <form onSubmit={handleUpload} className="stack">
          <label className="label">File (stored on IPFS via Pinata)</label>
          <input
            type="file"
            disabled={busy || !pinata}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {!pinata && (
            <p className="hint">Set <code>VITE_PINATA_JWT</code> in <code>client/.env</code> to enable uploads.</p>
          )}
          <button className="btn primary" disabled={busy || !file || !pinata}>Upload file</button>
        </form>

        <form onSubmit={handleAddLink} className="stack">
          <label className="label">Or add an existing IPFS CID / URL</label>
          <input
            placeholder="Name (optional)"
            value={linkName}
            disabled={busy}
            onChange={(e) => setLinkName(e.target.value)}
          />
          <input
            placeholder="ipfs://… or https://…"
            value={linkUrl}
            disabled={busy}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <button className="btn" disabled={busy || !linkUrl.trim()}>Add link</button>
        </form>
      </div>
      {status && <div className="alert info">{status}</div>}
      {error && <div className="alert error">{error}</div>}
    </section>
  );
}
