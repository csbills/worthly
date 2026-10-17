import { describe, expect, it, vi } from "vitest";

import { createTtlCache } from "./ttl-cache";

describe("createTtlCache", () => {
  it("reuses a loaded value until it expires", async () => {
    let now = 0;
    const cache = createTtlCache({ ttlMs: 1000, now: () => now });
    const load = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");

    await expect(cache.get("key", load)).resolves.toBe("a");
    now = 999;
    await expect(cache.get("key", load)).resolves.toBe("a");
    now = 1000;
    await expect(cache.get("key", load)).resolves.toBe("b");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    const load = vi.fn().mockResolvedValue("value");

    await Promise.all([cache.get("key", load), cache.get("key", load)]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not keep failed loads", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");

    await expect(cache.get("key", load)).rejects.toThrow("boom");
    await expect(cache.get("key", load)).resolves.toBe("ok");
  });

  it("forgets everything on clear", async () => {
    const cache = createTtlCache({ ttlMs: 1000 });
    const load = vi.fn().mockResolvedValue("value");

    await cache.get("key", load);
    cache.clear();
    await cache.get("key", load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
