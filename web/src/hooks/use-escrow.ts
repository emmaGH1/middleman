"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { chain, configured, escrowAddress, usdcAddress } from "@/config/contracts";
import { demoPassAbi, middlemanAbi } from "@/config/abi";

export function useEscrow() {
  const client = usePublicClient({ chainId: chain.id });
  return useQuery({
    queryKey: ["deployment", chain.id, escrowAddress], enabled: configured && !!client,
    queryFn: async () => {
      if (!client || !escrowAddress || !usdcAddress) throw new Error("No deployment configured.");
      if (await client.getChainId() !== chain.id) throw new Error("RPC chain does not match the configured Arc network.");
      const [collection, token] = await Promise.all([
        client.readContract({ address: escrowAddress, abi: middlemanAbi, functionName: "collection" }),
        client.readContract({ address: escrowAddress, abi: middlemanAbi, functionName: "usdc" }),
      ]);
      const [boundEscrow, mintCost, collectionToken] = await Promise.all([
        client.readContract({ address: collection, abi: demoPassAbi, functionName: "escrow" }),
        client.readContract({ address: collection, abi: demoPassAbi, functionName: "mintPrice" }),
        client.readContract({ address: collection, abi: demoPassAbi, functionName: "usdc" }),
      ]);
      if (token.toLowerCase() !== usdcAddress.toLowerCase() || collectionToken.toLowerCase() !== usdcAddress.toLowerCase()
        || boundEscrow.toLowerCase() !== escrowAddress.toLowerCase() || mintCost === 0n) throw new Error("Deployment binding mismatch. Transactions disabled.");
      return { collection, mintCost };
    }, refetchInterval: 15000,
  });
}

export function useDeal(id: bigint) {
  const client = usePublicClient({ chainId: chain.id });
  const deployment = useEscrow();
  return useQuery({
    queryKey: ["deal", chain.id, escrowAddress, id.toString()], enabled: !!client && !!deployment.data && !deployment.isError,
    queryFn: async () => {
      if (!client || !escrowAddress) throw new Error("No deployment configured.");
      const block = await client.getBlock();
      const deal = await client.readContract({ address: escrowAddress, abi: middlemanAbi, functionName: "getDeal", args: [id], blockNumber: block.number });
      return { deal, timestamp: block.timestamp };
    }, refetchInterval: 4000,
  });
}
