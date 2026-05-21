/**
 * Vault / LWT crypto surface — re-exports for TAS-compliant import paths.
 */
export {
  cryptoVerifySignature,
  buildBankVaultChallengeMessage,
  vaultIntegrityDisplayHash,
  type VaultSignatureVerifyInput,
} from "@/lib/security/vaultCrypto";

export { decryptLastWillPayload, encryptLastWillPayload } from "@/lib/security/lwtCrypto";
