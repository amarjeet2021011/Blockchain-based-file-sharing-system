export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function errorMessage(err) {
  return (
    err?.revert?.args?.[0] ||
    err?.reason ||
    err?.info?.error?.message ||
    err?.shortMessage ||
    err?.message ||
    String(err)
  );
}
