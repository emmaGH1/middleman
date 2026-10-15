"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { BaseError, encodeFunctionData, erc20Abi, type Abi, type Address, type Hash, type TransactionReceipt } from "viem";
import { chain, configured, escrowAddress, usdcAddress } from "@/config/contracts";
import { assertSigner, assertSuccessfulReceipt } from "@/lib/transaction-guards";
import { parseBroadcast, readJournal, subscribeJournal, writeJournal, type Broadcast } from "@/lib/transaction-journal";
import { useEscrow } from "./use-escrow";
import { useClock } from "./use-clock";

export function useTransaction() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: chain.id });
  const { data: wallet } = useWalletClient();
  const deployment = useEscrow();
  const queryClient = useQueryClient();
  const lock = useRef(false);
  const now = useClock();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hashes, setHashes] = useState<Hash[]>([]);
  const journalKey = `middleman:broadcast:${chain.id}:${escrowAddress}`;
  const journal = useSyncExternalStore(subscribeJournal, () => readJournal(journalKey), () => "");
  const unresolved = parseBroadcast(journal);
  const deploymentFresh = now > 0 && now - deployment.dataUpdatedAt < 30_000;
  const ready = configured && !!address && !!wallet && chainId === chain.id && !!deployment.data && !deployment.isError && deploymentFresh && !journal;
  const readiness = !configured ? "Deployment is not configured." : journal ? "A broadcast needs reconciliation before another action."
    : !address || !wallet ? "Connect a wallet to take an action." : chainId !== chain.id ? `Switch your wallet to ${chain.name}.`
      : !deployment.data || deployment.isError || !deploymentFresh ? "Deployment verification is unavailable or stale. Refresh before signing." : "";

  async function finishReceipt(record: Broadcast, receipt: TransactionReceipt) {
    if (!publicClient) throw new Error("RPC unavailable.");
    if (await publicClient.getChainId() !== chain.id) throw new Error("RPC network changed. Receipt not reconciled.");
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    if (block.hash !== receipt.blockHash || receipt.transactionHash.toLowerCase() !== record.hash.toLowerCase()) throw new Error("Receipt identity changed. Reconcile again.");
    const tx = await publicClient.getTransaction({ hash: receipt.transactionHash });
    writeJournal(journalKey);
    assertSuccessfulReceipt(receipt);
    if (tx.from.toLowerCase() !== record.sender.toLowerCase() || tx.to?.toLowerCase() !== record.target.toLowerCase() || tx.input.toLowerCase() !== record.data.toLowerCase()) {
      throw new Error("A replacement transaction confirmed, but it was not the requested action. Recheck the deal before continuing.");
    }
    await queryClient.invalidateQueries();
    return receipt;
  }

  async function reconcile() {
    if (lock.current || !unresolved || !publicClient) return;
    lock.current = true; setPending(true); setError("");
    try {
      setMessage(`Checking ${unresolved.label} receipt…`);
      const receipt = await publicClient.getTransactionReceipt({ hash: unresolved.hash });
      await finishReceipt(unresolved, receipt);
      setMessage(`${unresolved.label} confirmed. State refreshed. Check the next permitted action; nothing else was sent.`);
    } catch (cause) {
      setMessage("");
      setError(readJournal(journalKey) ? "Receipt is still unavailable or inconsistent. The transaction may be pending. Check the explorer and reconcile again; do not send a duplicate." : errorText(cause));
    } finally { lock.current = false; setPending(false); }
  }

  async function run(target: Address, abi: Abi, functionName: string, args: readonly unknown[] = [], payment?: { spender: Address; amount: bigint }) {
    if (lock.current) return;
    lock.current = true;
    setError(""); setMessage(""); setHashes([]); setPending(true);
    try {
      if (!ready || !wallet || !publicClient || !address || !escrowAddress || !usdcAddress || readJournal(journalKey)) throw new Error(readiness || "Connect the configured wallet and reconcile first.");
      const send = async (contract: Address, contractAbi: Abi, fn: string, values: readonly unknown[], label: string) => {
        await assertSigner(wallet, publicClient, chain.id, address);
        setMessage(`Checking ${label} against the contract…`);
        const { request } = await publicClient.simulateContract({ address: contract, abi: contractAbi, functionName: fn, args: values, account: address });
        await assertSigner(wallet, publicClient, chain.id, address);
        setMessage(`Confirm ${label} in your wallet.`);
        const hash = await wallet.writeContract({ ...request, chain, account: address });
        let record: Broadcast = { hash, sender: address, target: contract, data: encodeFunctionData({ abi: contractAbi, functionName: fn, args: values }), label };
        writeJournal(journalKey, record);
        setHashes(previous => [...previous, hash]);
        setMessage(`Waiting for ${label} receipt…`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000, onReplaced: replacement => {
          record = { ...record, hash: replacement.transactionReceipt.transactionHash };
          writeJournal(journalKey, record);
          setHashes(previous => [...previous, record.hash]);
        } });
        return finishReceipt(record, receipt);
      };
      if (payment && payment.amount > 0n) {
        await assertSigner(wallet, publicClient, chain.id, address);
        const allowance = await publicClient.readContract({ address: usdcAddress, abi: erc20Abi, functionName: "allowance", args: [address, payment.spender] });
        if (allowance < payment.amount) await send(usdcAddress, erc20Abi, "approve", [payment.spender, payment.amount], "USDC approval");
      }
      const receipt = await send(target, abi, functionName, args, functionName);
      setMessage("Confirmed onchain. Deal state refreshed.");
      return receipt;
    } catch (cause) {
      setMessage("");
      setError(readJournal(journalKey) ? "Broadcast sent, but its outcome is not yet confirmed. Reconcile the receipt before trying again." : errorText(cause));
    } finally { lock.current = false; setPending(false); }
  }
  return { run, reconcile, unresolved, pending, ready, readiness, message, error, hashes };
}

function errorText(cause: unknown) {
  return cause instanceof BaseError ? cause.shortMessage : cause instanceof Error ? cause.message : "Transaction failed.";
}
