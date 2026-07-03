import { describe, expect, it } from "vitest";

import {
  bigintReplacer,
  installBigIntJsonPrototype,
  stringifyJsonSafe,
  toJsonSafe,
} from "@/lib/utils/serialization";

describe("serialization", () => {
  it("serializes BigInt values to strings", () => {
    const payload = { amountCents: 590000000n, nested: { loss: 1110000000n } };
    expect(toJsonSafe(payload)).toEqual({
      amountCents: "590000000",
      nested: { loss: "1110000000" },
    });
  });

  it("stringifyJsonSafe never throws on BigInt", () => {
    expect(stringifyJsonSafe({ v: 42n })).toBe('{"v":"42"}');
    expect(bigintReplacer("k", 7n)).toBe("7");
  });

  it("installBigIntJsonPrototype is idempotent", () => {
    installBigIntJsonPrototype();
    installBigIntJsonPrototype();
    expect(JSON.stringify({ x: 5n })).toBe('{"x":"5"}');
  });
});
