import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";
import {
  APITimeoutError,
  AuthenticationError,
  RateLimitError,
  UnprocessableEntityError,
} from "@typesafe-ai/sdk";
import { mapError, redact } from "../dist/errors.js";

describe("redact", () => {
  const original = process.env.TYPESAFE_API_KEY;

  before(() => {
    process.env.TYPESAFE_API_KEY = "supersecretkeyvalue123";
  });
  after(() => {
    if (original === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = original;
  });

  it("removes the configured API key", () => {
    const out = redact("request failed with key supersecretkeyvalue123 attached");
    assert.equal(out.includes("supersecretkeyvalue123"), false);
    assert.equal(out.includes("[REDACTED]"), true);
  });

  it("removes bearer tokens", () => {
    const out = redact("Authorization: Bearer abcdefghijklmnop");
    assert.equal(out.includes("abcdefghijklmnop"), false);
  });

  it("removes sk-style tokens", () => {
    const out = redact("token sk-abcdefgh12345678 leaked");
    assert.equal(out.includes("sk-abcdefgh12345678"), false);
  });

  it("removes apikey-style tokens that differ from the configured key", () => {
    const token = "apikey_example1234567890";
    assert.notEqual(token, process.env.TYPESAFE_API_KEY);
    const out = redact(`token ${token} leaked`);
    assert.equal(out.includes(token), false);
    assert.equal(out.includes("[REDACTED]"), true);
  });

  it("leaves ordinary text alone", () => {
    assert.equal(redact("a normal message"), "a normal message");
  });

  it("still redacts a short key rather than silently skipping it", () => {
    const previous = process.env.TYPESAFE_API_KEY;
    process.env.TYPESAFE_API_KEY = "k7Qm2x";
    try {
      assert.equal(redact("failed for k7Qm2x").includes("k7Qm2x"), false);
    } finally {
      process.env.TYPESAFE_API_KEY = previous;
    }
  });
});

describe("mapError", () => {
  const headers = new Headers();

  it("maps 401 without echoing the upstream body", () => {
    const mapped = mapError(new AuthenticationError(401, { secret: "leak-me-please" }, headers));
    assert.equal(mapped.category, "authentication");
    assert.equal(mapped.retryable, false);
    assert.equal(mapped.message.includes("leak-me-please"), false);
  });

  it("maps 429 as retryable", () => {
    const mapped = mapError(new RateLimitError(429, {}, headers));
    assert.equal(mapped.category, "rate_limit");
    assert.equal(mapped.retryable, true);
  });

  it("maps 422 as a non-retryable validation error", () => {
    const mapped = mapError(new UnprocessableEntityError(422, {}, headers));
    assert.equal(mapped.category, "validation");
    assert.equal(mapped.retryable, false);
  });

  it("maps timeouts as retryable and reports the limit", () => {
    const mapped = mapError(new APITimeoutError(10000));
    assert.equal(mapped.category, "timeout");
    assert.equal(mapped.retryable, true);
    assert.equal(mapped.message.includes("10000"), true);
  });

  it("maps unknown errors without leaking internals", () => {
    const mapped = mapError(new Error("something odd"));
    assert.equal(mapped.category, "internal");
    assert.equal(mapped.retryable, false);
  });
});
