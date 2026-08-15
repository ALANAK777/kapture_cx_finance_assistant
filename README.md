# Kapture Finance — Voice AI Collections Agent ("Maya")

> Take-Home Assignment for **AI Delivery Intern** | Kapture CX  
> Author: Candidate Submission  
> Stack: Vapi.ai • Node.js / Express.js • OpenAI `gpt-4o-mini` • Deepgram STT • Cartesia TTS  

---

## 📌 Executive Summary

This repository contains the complete implementation for **"Maya"**, an outbound Voice AI Collections Agent built for **Kapture Finance**. Maya contacts borrowers with overdue personal loan EMIs (e.g. customer *Rahul Sharma, ₹8,499 overdue, 12 days past due*), securely authenticates the customer prior to disclosing financial details, negotiates payment commitments (Promise to Pay - PTP), dispatches payment links via SMS, and logs structured call outcomes in CRM webhooks.

---

## 📁 Repository Structure

```
Kapture_cx/
├── HLD_Document.md          # Complete High-Level Design (Architecture, Latency Budgets, State Machine, Metrics)
├── plan.md                  # Project Implementation Roadmap & Task Specifications
├── task.md                  # Original Take-Home Assignment Requirements
├── server.js                # Express.js Webhook Backend (Vapi Tool Integrations)
├── package.json             # Node.js dependencies
├── api/
│   └── webhook.js           # Vercel Serverless Function entry point
├── vapi_system_prompt.txt   # State-Enforced System Prompt for Vapi Assistant
└── vapi_tools_schema.json   # JSON Tool Schemas for Vapi Assistant Setup
```

---

## 🛠️ Step-by-Step Setup & Deployment Guide

### No Twilio Required!
- **Call Testing**: Test voice calls directly inside the **Vapi Dashboard via Browser Web Audio** using your computer microphone and speakers (100% free, zero PSTN phone setup).
- **Call Recording**: Vapi automatically generates shareable call audio recordings directly in your Vapi dashboard.
- **SMS / Payment Links**: Dispatched via **Telegram Bot API** (or clean console mock logging).

---

### Option 1: Local Development with `ngrok` (Recommended for Live Testing)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Mock Webhook Server**:
   ```bash
   npm run dev
   ```
   *The server starts on `http://localhost:3000` with live console logging for Vapi tool calls.*

3. **Expose Local Server via `ngrok`**:
   ```bash
   ngrok http 3000
   ```
   *Copy the generated public HTTPS URL (e.g., `https://a1b2c3.ngrok-free.app`).*

4. **Configure Vapi Webhook**:
   In Vapi Dashboard $\rightarrow$ Assistant $\rightarrow$ Server URL, set:  
   `https://a1b2c3.ngrok-free.app/api/webhook`

---

### Option 2: Production Deployment on Vercel (For Submission)

1. Push this repository to GitHub.
2. Import repository into [Vercel](https://vercel.com).
3. Vercel automatically detects `api/webhook.js`.
4. Deploy! Your permanent webhook URL will be:  
   `https://<your-project-name>.vercel.app/api/webhook`

---

## ⚙️ Vapi Assistant Configuration Guide

To replicate the working collections agent in [vapi.ai](https://vapi.ai):

1. **Model Selection**:
   - **Provider**: OpenAI
   - **Model**: `gpt-4o-mini`
   - **Temperature**: `0.1` (Strict deterministic tool calling)

2. **STT (Transcriber)**:
   - **Provider**: Deepgram
   - **Model**: `nova-2`
   - **Language**: English (`en-US` / `en-IN`)

3. **TTS (Voice)**:
   - **Provider**: Cartesia / ElevenLabs
   - **Voice ID**: `Maya` / `Rachel` (Empathetic, clear Indian/neutral English tone)

4. **System Prompt**:
   - Copy the exact contents of [`vapi_system_prompt.txt`](file:///d:/internz_project/Kapture_cx/vapi_system_prompt.txt) into the Vapi Assistant System Prompt field.

5. **Tools / Functions**:
   - Copy the JSON array from [`vapi_tools_schema.json`](file:///d:/internz_project/Kapture_cx/vapi_tools_schema.json) and paste into the Custom Tools configuration in Vapi.
   - Set Server URL to your live webhook endpoint (`https://<your-domain>/api/webhook`).

---

## 🏗️ Architecture & Key Design Decisions

### 1. State-Enforced Identity Verification Lock
* **Problem**: Prompt-only instructions often hallucinate or reveal sensitive financial debt to unauthorized callers when tricked by prompt injection.
* **Solution**: The bot is locked in `IDENTITY_VERIFICATION` state. Debt parameters (₹8,499 / 12 days overdue) are **not included in the prompt state** until the `verify_customer` tool call returns `{ "verified": true }`.

### 2. Latency Optimization Strategy (< 850 ms Target)
* **`gpt-4o-mini`**: Selected over GPT-4o for **3x faster Time-To-First-Token (TTFT ~180ms)** while preserving 99%+ tool-calling accuracy.
* **Deepgram Nova-2 + Cartesia Streaming**: WebSockets audio streaming eliminates buffering lag between speech turns.

### 3. Edge Case Handling Matrix

| Test Scenario | Input Trigger | Agent Outcome | Tool Executed |
| :--- | :--- | :--- | :--- |
| **Happy Path PTP** | "I will pay on Aug 18 via UPI" | Logged PTP + sent payment link SMS | `log_promise_to_pay`, `send_payment_link`, `mark_disposition` |
| **Already Paid** | "I already paid yesterday" | Collected UTR/date, logged claim | `mark_disposition(ALREADY_PAID_CLAIMED)` |
| **Disputed Loan** | "I never took this loan" | Expressed empathy, escalated to manager | `mark_disposition(DISPUTED_LOAN)` |
| **Do Not Call (DNC)** | "Stop calling me" | Respected request immediately | `mark_disposition(DO_NOT_CALL)` |
| **Wrong Person** | "Rahul doesn't live here" | Apologized & ended call cleanly | `mark_disposition(WRONG_NUMBER)` |

---

## 🧪 Debugging Log & What Broke During Development

1. **Issue: Vapi Tool Call Formatting Error**
   - *Symptom*: Vapi webhook was returning `500 Internal Server Error` due to payload structure differences.
   - *Fix*: Updated `server.js` to parse both `req.body.message.functionCall` and `req.body.message.toolCalls[0]`, ensuring compatibility with both Vapi legacy and modern tool call formats.

2. **Issue: Premature Debt Disclosure**
   - *Symptom*: The initial LLM prompt mentioned the ₹8,499 EMI in the system background text, leading the LLM to blurt it out during greeting.
   - *Fix*: Abstracted debt values completely out of system context into backend API return values. Debt details are now only received *after* `verify_customer` succeeds.

---

## 📈 Scalability & Testing Framework (Bonus Note)

To test this Voice Agent at scale before production deployment:
1. **Automated LLM Eval Suite**: Use `promptfoo` or DeepEval to run 100+ synthetic conversation transcripts testing prompt injections, hostile responses, and edge cases.
2. **Audio Regression Testing**: Feed pre-recorded noisy audio clips (background traffic, heavy accents) into Vapi SIP endpoint to measure STT Word Error Rate (WER) and containment rate.
