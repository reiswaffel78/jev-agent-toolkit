import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { evaluateInput, MAX_CHOICE_OPTIONS } from "../dist/schemas.js";

const validChoice = {
  type: "choice",
  instructions: "Which subsystem?",
  criteria: { auth: "Login and tokens.", billing: "Invoices.", other: null },
};

describe("evaluateInput", () => {
  it("accepts a batched request with all three primitives", () => {
    const result = evaluateInput.safeParse({
      state: { subject: "Charged twice", body: "Please refund me." },
      questions: {
        intent: validChoice,
        severity: { type: "score", instructions: "How severe?", criteria: ["None", "Minor", "Major"] },
        refund: { type: "noul", instructions: "Asking for a refund?" },
      },
    });
    assert.equal(result.success, true);
  });

  it("accepts a plain string state", () => {
    assert.equal(
      evaluateInput.safeParse({ state: "some text", questions: { q: validChoice } }).success,
      true,
    );
  });

  it("accepts an explicit model override", () => {
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: validChoice },
      model: "jev-1.13.0",
    });
    assert.equal(result.success, true);
  });

  it("rejects an empty question set", () => {
    assert.equal(evaluateInput.safeParse({ state: "x", questions: {} }).success, false);
  });

  it("rejects an unknown question type", () => {
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: { type: "ranking", instructions: "?" } },
    });
    assert.equal(result.success, false);
  });

  it("rejects a choice with fewer than two options", () => {
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: { type: "choice", instructions: "?", criteria: { only: "one" } } },
    });
    assert.equal(result.success, false);
  });

  it(`rejects a choice with more than ${MAX_CHOICE_OPTIONS} options`, () => {
    const criteria = {};
    for (let i = 0; i <= MAX_CHOICE_OPTIONS; i += 1) criteria[`opt${i}`] = `Option ${i}`;
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: { type: "choice", instructions: "?", criteria } },
    });
    assert.equal(result.success, false);
  });

  it("rejects a score with fewer than two levels", () => {
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: { type: "score", instructions: "?", criteria: ["only one"] } },
    });
    assert.equal(result.success, false);
  });

  it("rejects a score with more than ten levels", () => {
    const criteria = Array.from({ length: 11 }, (_, i) => `Level ${i}`);
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: { type: "score", instructions: "?", criteria } },
    });
    assert.equal(result.success, false);
  });

  it("rejects a choice missing its criteria entirely", () => {
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: { type: "choice", instructions: "?" } },
    });
    assert.equal(result.success, false);
  });

  it("does not accept an arbitrary upstream URL", () => {
    // The tool surface has no url/endpoint field at all; unknown keys must not
    // become a way to redirect the request.
    const result = evaluateInput.safeParse({
      state: "x",
      questions: { q: validChoice },
      url: "https://attacker.example/v1/systemone",
    });
    const parsed = result.success ? result.data : {};
    assert.equal("url" in parsed, false);
  });
});
