import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { middlemanAbi, demoPassAbi } from "../src/config/abi";
import type { Abi, AbiParameter } from "viem";

function parameters(items: readonly AbiParameter[]): unknown {
  return items.map(item => ({ type: item.type, ...("components" in item ? { components: item.components.map(c => ({ name: c.name, shape: parameters([c]) })) } : {}) }));
}
for (const [name, abi] of [["Middleman", middlemanAbi], ["DemoPass", demoPassAbi]] as const) {
  const built = JSON.parse(readFileSync(new URL(`../../contracts/out/${name}.sol/${name}.json`, import.meta.url), "utf8")).abi as Abi;
  for (const entry of abi) {
    const actual = built.find(item => item.type === entry.type && "name" in item && item.name === entry.name);
    assert.ok(actual && "inputs" in actual, `${name}.${entry.name} missing`);
    assert.deepEqual(parameters(entry.inputs), parameters(actual.inputs), `${name}.${entry.name} input mismatch`);
    if (entry.type === "function" && actual.type === "function") {
      assert.deepEqual(parameters(entry.outputs), parameters(actual.outputs), `${name}.${entry.name} return mismatch`);
      assert.equal(entry.stateMutability, actual.stateMutability);
    }
    if (entry.type === "event" && actual.type === "event") assert.deepEqual(entry.inputs.map(i => !!("indexed" in i && i.indexed)), actual.inputs.map(i => !!("indexed" in i && i.indexed)));
  }
}
console.log("Frontend ABIs match compiled contracts, including named return tuples.");
