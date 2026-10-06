const env = import.meta.env;
const GATEWAY = (env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud").replace(/\/+$/, "");

export function isPinataConfigured() {
  return Boolean(env.VITE_PINATA_JWT || (env.VITE_PINATA_API_KEY && env.VITE_PINATA_API_SECRET));
}

function authHeaders() {
  if (env.VITE_PINATA_JWT) return { Authorization: `Bearer ${env.VITE_PINATA_JWT}` };
  return {
    pinata_api_key: env.VITE_PINATA_API_KEY,
    pinata_secret_api_key: env.VITE_PINATA_API_SECRET,
  };
}

export async function uploadToPinata(file) {
  if (!isPinataConfigured()) {
    throw new Error("Pinata is not configured. Set VITE_PINATA_JWT in client/.env.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("pinataMetadata", JSON.stringify({ name: file.name }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }
  const { IpfsHash } = await res.json();
  return `ipfs://${IpfsHash}`;
}

export function toGatewayUrl(url) {
  if (url.startsWith("ipfs://")) return `${GATEWAY}/ipfs/${url.slice(7)}`;
  return url;
}
