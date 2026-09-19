"""Ticket triage with Jev: one batched request, all policy in code.

    pip install typesafe-sdk
    export TYPESAFE_API_KEY=...
    python triage.py

Demonstrates the shape this toolkit recommends:
  - deterministic parsing before Jev
  - every judgment, including speculative ones, in ONE request
  - thresholds and side effects in code, never in the question
  - probabilities persisted, not just the verdict
"""

from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

TICKET = {
    "subject": "Charged twice for the same invoice",
    "body": (
        "Hi, I was billed twice this month for invoice #4471. "
        "I have already tried the help centre. Please refund the duplicate."
    ),
}

# Thresholds are policy. They live here, versioned and reviewable — never inside
# the question text. Start conservative and tune against labeled data.
MIN_ROUTING_CONFIDENCE = 0.60
SECURITY_SUSPICION = 0.50
ESCALATE_AT_SEVERITY = 2.5

SEVERITY_LEVELS = [
    "No impact: cosmetic or informational only.",
    "Minor: annoying, but a workaround exists.",
    "Major: a core workflow is blocked.",
    "Critical: money lost, data lost, or a total outage.",
]


def main() -> None:
    with TypeSafeClient() as client:
        # One request. Extra questions are evaluated in parallel and cost
        # little; a second request would cost a full round-trip.
        response = client.system_one(
            state=TICKET,
            questions={
                "subsystem": Choice(
                    instructions="Which subsystem does this ticket concern?",
                    criteria={
                        "billing": "Invoices, payments, refunds, subscriptions.",
                        "auth": "Login, sessions, passwords, permissions.",
                        "other": "Anything not covered by the options above.",
                    },
                ),
                "severity": Score(
                    instructions="How severe is the impact on this user?",
                    criteria=SEVERITY_LEVELS,
                ),
                # Speculative: only read when subsystem == billing.
                "is_refund_request": Noul(
                    instructions="Is the author explicitly asking for money back?",
                    criteria={
                        "true": "An explicit request for a refund or reversal.",
                        "false": "A complaint or question with no refund request.",
                    },
                ),
                # Speculative: only read when subsystem == auth.
                "is_account_takeover": Noul(
                    instructions="Does the author describe unauthorised account access?",
                ),
                "has_tried_self_service": Noul(
                    instructions="Does the author say they already tried the help centre or docs?",
                ),
            },
        )

    subsystem = response.choices["subsystem"]
    severity = response.scores["severity"]

    print(f"model={response.model}  tokens_in={response.usage.input_tokens}")
    print(f"subsystem={subsystem.choice} (confidence {subsystem.confidence:.2f})")
    print(f"  distribution: {subsystem.probabilities}")
    print(f"severity={severity.score:.2f} (confidence {severity.confidence:.2f})")

    # --- Policy. Deterministic, auditable, and outside the model. ---

    if response.nouls["is_account_takeover"].noul > SECURITY_SUSPICION:
        # Deliberately asymmetric: a false positive costs a human review,
        # a false negative costs a compromised account.
        print("-> private security queue")
        return

    if subsystem.confidence < MIN_ROUTING_CONFIDENCE:
        # Every low-confidence branch needs a real destination.
        print("-> human triage (routing confidence too low)")
        return

    print(f"-> team: {subsystem.choice}")

    if subsystem.choice == "billing" and response.nouls["is_refund_request"].noul > 0.5:
        print("-> flagged as a refund request")

    if severity.score >= ESCALATE_AT_SEVERITY:
        print("-> escalated on severity")

    if not response.nouls["has_tried_self_service"].noul > 0.5:
        print("-> suggest self-service first")


if __name__ == "__main__":
    main()
