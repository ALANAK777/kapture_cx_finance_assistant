**Kapture** 

**AI Delivery Intern – Take-Home Assignment** 

Voice AI   •   Collections Agent Voicebot   •   Est. 1 day   •   Individual submission 

This assignment mirrors the real work of our AI Delivery team: taking a client requirement, designing the voicebot end-to-end, and shipping a working build on a voice platform. We care far more about how you think, structure, and debug than about polish. Use any AI tools you like — we assume you will. 

**The Scenario** 

A lending client, “Kapture Finance,” wants an outbound voice agent that calls customers with an overdue loan EMI and drives them to pay — politely, compliantly, and without human agents on routine calls. 

Example call context you can assume: 

- Customer: Rahul Sharma • Personal loan • Overdue EMI ₹8,499 • 12 days past due. 

* The bot (“Maya” from Kapture Finance) places an outbound call and must run the full collections conversation. 

A good agent should authenticate the customer, disclose the purpose, state the overdue amount, understand intent, and either collect a payment commitment or route appropriately — all while staying inside fair-collection norms. 

**Task 1 — High-Level Design (HLD)** 

Produce a concise design document (PDF or Doc, plus one architecture diagram) for the collections voicebot. Treat it as something you’d hand to an engineer to build. It should cover: 

- **Architecture & pipeline —** telephony → STT → orchestrator/LLM → TTS, plus where your tools/APIs and datastore sit. Call out latency budgets per hop. 

* **Conversation flow / state machine —** the states, transitions, and what locks each state (auth must be state-enforced, not prompt-discretionary). 

- **Intents & entities —** will-pay, cannot-pay (hardship), dispute, already-paid, wrong-person, callback-request, hostile, etc., and what you extract (PTP date, amount). 

* **Tools / API calls —** e.g. get\_account\_details, verify\_customer, log\_promise\_to\_pay, send\_payment\_link, escalate\_to\_agent, mark\_disposition. Define inputs/outputs. 

- **Auth & data safety —** how you verify identity before disclosing any debt, and how you avoid revealing debt to a third party who answers the phone. 

* **Guardrails & compliance —** mandatory self/company/purpose disclosure, permitted calling hours, no threats or harassment, opt-out handling, hallucination and off-topic guardrails. 

- **Edge cases —** already paid, disputes the amount, requests do-not-call, wrong number, voicemail/no input timeout, abusive caller, mid-call language switch (EN/HI). 

* **Escalation & disposition —** when to hand off to a human, and how every call ends with a logged outcome. 

- **Observability —** what you’d log and which metrics (containment, PTP rate, avg latency, drop rate) you’d track to debug and improve the bot. 

**Task 2 — Build It on Vapi** 

Build the same collections voicebot as a working voice agent on Vapi (vapi.ai — the free trial credits are enough). “Working” means we can place or receive a call and have a real collections conversation. Your build should reflect the HLD from Task 1. 

**Requirements** 

- **A configured Vapi assistant —** model, voice, and transcriber chosen deliberately (tell us why in your notes). 

* **A system prompt** that implements your flow: identity disclosure, state-enforced authentication before any debt is revealed, the negotiation logic, and the closing/disposition. 

- **At least 3 functions/tools** wired up (server URL / webhook — mocked endpoints are fine): e.g. verify\_customer, log\_promise\_to\_pay, send\_payment\_link. 

* **Guardrails in practice —** the bot must not disclose the debt before verification and must handle a do-not-call and an “already paid” gracefully. 

- **A working demo —** a call recording (or shared Vapi call) showing at least two paths: a successful promise-to-pay, and one edge case (dispute, wrong-person, or already-paid). 

**What to submit for Task 2** 

- Link to the demo call recording (or a 2–4 min Loom walking through a live call). 

* Your final system prompt and the function/tool JSON schemas. 

- A short README: setup, design choices, what broke and how you debugged it, and what you’d improve with more time. 

**What We’re Evaluating** 

- Prompt engineering — clarity, structure, and control of the LLM’s behaviour. 

* Flow & state design — is auth actually enforced, or can the bot be talked past it? 

- Tool calling — correct, well-scoped functions and sensible schemas. 

* Robustness & debugging — how you handle edge cases and reason about failures. 

- Compliance instinct — disclosure, verification-before-disclosure, do-not-call, tone. 

* Communication — a clear HLD and README a teammate could pick up. 

We do not expect production perfection. A thoughtful, honest, working-enough build beats an over-engineered one that doesn’t run. 

**Bonus (optional)** 

- Bilingual handling — the bot switches cleanly between English and Hindi mid-call. 

* A real (mock) payment-link SMS/WhatsApp trigger via a webhook. 

- A short note on how you’d test this at scale (test cases / eval framework). 

**Submission** 

- Send everything (HLD doc + diagram + Task 2 links + README) as a single email or one Drive folder link. 

* Deadline: within 1 day (24 hours) of receiving this assignment. 

- Stuck on scope? Make a reasonable assumption, state it, and move on — we value judgement over guesswork paralysis. 

*Have fun with it — this is exactly the kind of problem you’d own on the team.* 





Explain this project