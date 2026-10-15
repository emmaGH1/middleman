import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function configuration(values: Record<string, string | undefined> = {}) {
  const env = {
    ...process.env,
    NEXT_PUBLIC_ARC_CHAIN_ID: "5042002",
    NEXT_PUBLIC_LOCAL_CHAIN: "0",
    NEXT_PUBLIC_LOCAL_USDC_ADDRESS: "0x2222222222222222222222222222222222222222",
    NEXT_PUBLIC_MIDDLEMAN_ADDRESS: "0x1111111111111111111111111111111111111111",
    NEXT_PUBLIC_DEPLOYMENT_BLOCK: "67275471",
    ...values,
  };
  return JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "--eval", `
    const { configured, chain } = require('./src/config/contracts.ts');
    console.log(JSON.stringify({ configured, chainId: chain.id }));
  `], { cwd: fileURLToPath(new URL("../..", import.meta.url)), env, encoding: "utf8" })) as { configured: boolean; chainId: number };
}

test("only explicit supported Arc networks enable a public deployment", () => {
  assert.deepEqual(configuration(), { configured: true, chainId: 5042002 });
  assert.deepEqual(configuration({ NEXT_PUBLIC_ARC_CHAIN_ID: "5042" }), { configured: true, chainId: 5042 });
  for (const id of [undefined, "", "1", "504200", "5042 "]) {
    assert.equal(configuration({ NEXT_PUBLIC_ARC_CHAIN_ID: id }).configured, false, `chain ${id}`);
  }
});

test("local testing requires the exact opt-in flag and its own USDC address", () => {
  assert.deepEqual(configuration({ NEXT_PUBLIC_LOCAL_CHAIN: "1" }), { configured: true, chainId: 31337 });
  assert.equal(configuration({ NEXT_PUBLIC_LOCAL_CHAIN: "true" }).configured, false);
  assert.equal(configuration({ NEXT_PUBLIC_LOCAL_CHAIN: "1", NEXT_PUBLIC_LOCAL_USDC_ADDRESS: undefined }).configured, false);
});

test("missing or invalid deployment addresses and blocks fail closed", () => {
  for (const address of [undefined, "", "not-an-address", "0x0000000000000000000000000000000000000000"]) {
    assert.equal(configuration({ NEXT_PUBLIC_MIDDLEMAN_ADDRESS: address }).configured, false);
  }
  for (const block of [undefined, "", "-1", "1.5", "1e6"]) {
    assert.equal(configuration({ NEXT_PUBLIC_DEPLOYMENT_BLOCK: block }).configured, false);
  }
});
