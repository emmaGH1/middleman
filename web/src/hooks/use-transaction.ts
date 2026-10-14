"use client";

import { useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { BaseError, erc20Abi, type Abi, type Address, type Hash } from "viem";
import { chain, escrowAddress, usdcAddress } from "@/config/contracts";
import { useEscrow } from "./use-escrow";

export function useTransaction() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: chain.id });
  const { data: wallet } = useWalletClient();
  const deployment = useEscrow();
  const queryClient = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hashes, setHashes] = useState<Hash[]>([]);
  const ready = !!address && !!wallet && chainId === chain.id && !!deployment.data && !deployment.isError;

  async function run(target: Address, abi: Abi, functionName: string, args: readonly unknown[] = [], payment?: { spender: Address; amount: bigint }) {
    if (lock.current) return;
    lock.current = true;
    setError(""); setMessage(""); setHashes([]); setPending(true);
    try {
      if (!ready || !wallet || !publicClient || !address || !escrowAddress || !usdcAddress) throw new Error("Connect your wallet on the configured network and verify the deployment first.");
      if (await wallet.getChainId() !== chain.id || (await wallet.getAddresses())[0]?.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet changed. Reconnect and try again.");
      const send = async (contract: Address, contractAbi: Abi, fn: string, values: readonly unknown[], label: string) => {
        if (await wallet.getChainId() !== chain.id || (await wallet.getAddresses())[0]?.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet changed during transaction. Please retry.");
        setMessage(`Confirm ${label} in your wallet.`);
        const { request } = await publicClient.simulateContract({ address: contract, abi: contractAbi, functionName: fn, args: values, account: address });
        const hash = await wallet.writeContract({ ...request, chain, account: address });
        setHashes(previous => [...previous, hash]);
        setMessage(`Waiting for ${label} receipt…`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error(`${label} reverted onchain.`);
        return receipt;
      };
      if (payment && payment.amount > 0n) {
        const allowance = await publicClient.readContract({ address: usdcAddress, abi: erc20Abi, functionName: "allowance", args: [address, payment.spender] });
        if (allowance < payment.amount) await send(usdcAddress, erc20Abi, "approve", [payment.spender, payment.amount], "USDC approval");
      }
      const receipt = await send(target, abi, functionName, args, functionName);
      setMessage("Confirmed onchain.");
      await queryClient.invalidateQueries();
      return receipt;
    } catch (cause) {
      setMessage("");
      setError(cause instanceof BaseError ? cause.shortMessage : cause instanceof Error ? cause.message : "Transaction failed.");
    } finally { lock.current = false; setPending(false); }
  }
  return { run, pending, ready, message, error, hashes };
}
