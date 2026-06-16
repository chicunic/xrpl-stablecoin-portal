const network = (import.meta.env.VITE_XRPL_NETWORK as string | undefined) ?? "testnet";

const EXPLORER_BASE =
  network === "mainnet"
    ? "https://xrpl.org"
    : network === "devnet"
      ? "https://devnet.xrpl.org"
      : "https://testnet.xrpl.org";

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE}/transactions/${txHash}`;
}
