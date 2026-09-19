/**
 * Ticket triage with Jev: one batched request, all policy in code.
 *
 *   npm install @typesafe-ai/sdk
 *   export TYPESAFE_API_KEY=...
 *   node triage.mjs
 *
 * The JavaScript SDK returns one flat `answers` map keyed by question id.
 * (The Python SDK groups answers by primitive instead — see jev-api.md.)
 */

import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";

const TICKET = {
  subject: "Charged twice for the same invoice",
  body:
    "Hi, I was billed twice this month for invoice #4471. " +
    "I have already tried the help centre. Please refund the duplicate.",
};

// Policy lives here, not in the questions.
const MIN_ROUTING_CONFIDENCE = 0.6;
const SECURITY_SUSPICION = 0.5;
const ESCALATE_AT_SEVERITY = 2.5;

const client = new TypeSafeClient();

// One request. Speculative questions are cheap; a second round-trip is not.
const { model, answers, usage } = await client.systemOne({
  state: TICKET,
  questions: {
    subsystem: choice("Which subsystem does this ticket concern?", {
      billing: "Invoices, payments, refunds, subscriptions.",
      auth: "Login, sessions, passwords, permissions.",
      other: "Anything not covered by the options above.",
    }),
    severity: score("How severe is the impact on this user?", [
      "No impact: cosmetic or informational only.",
      "Minor: annoying, but a workaround exists.",
      "Major: a core workflow is blocked.",
      "Critical: money lost, data lost, or a total outage.",
    ]),
    isRefundRequest: noul("Is the author explicitly asking for money back?", {
      true: "An explicit request for a refund or reversal.",
      false: "A complaint or question with no refund request.",
    }),
    isAccountTakeover: noul("Does the author describe unauthorised account access?"),
    hasTriedSelfService: noul("Does the author say they already tried the help centre or docs?"),
  },
});

const { subsystem, severity } = answers;

console.log(`model=${model}  tokens_in=${usage.input_tokens}`);
console.log(`subsystem=${subsystem.choice} (confidence ${subsystem.confidence.toFixed(2)})`);
console.log("  distribution:", subsystem.probabilities);
console.log(`severity=${severity.score.toFixed(2)} (confidence ${severity.confidence.toFixed(2)})`);

// --- Policy. Deterministic, auditable, and outside the model. ---

if (answers.isAccountTakeover.noul > SECURITY_SUSPICION) {
  // Asymmetric on purpose: a false positive costs a review, a false negative
  // costs a compromised account.
  console.log("-> private security queue");
} else if (subsystem.confidence < MIN_ROUTING_CONFIDENCE) {
  console.log("-> human triage (routing confidence too low)");
} else {
  console.log(`-> team: ${subsystem.choice}`);

  if (subsystem.choice === "billing" && answers.isRefundRequest.noul > 0.5) {
    console.log("-> flagged as a refund request");
  }
  if (severity.score >= ESCALATE_AT_SEVERITY) {
    console.log("-> escalated on severity");
  }
  if (answers.hasTriedSelfService.noul <= 0.5) {
    console.log("-> suggest self-service first");
  }
}
