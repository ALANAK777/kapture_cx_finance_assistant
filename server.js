require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. MOCK CRM CUSTOMER DATABASE
// ==========================================
const CUSTOMER_DB = {
  "CUST_9942": {
    name: "Akhil",
    phone: "+919876543210",
    dob_year: "2005",
    last4_mobile: "3210",
    loan_type: "Personal Loan",
    overdue_amount: 8499,
    days_overdue: 12,
    due_date: "2026-08-03"
  }
};

// ==========================================
// 2. HELPER UTILITIES
// ==========================================

/**
 * Extracts tool call metadata (function name, tool call ID, and arguments)
 * from Vapi's webhook request payload.
 */
function extractToolCallMetadata(req) {
  const bodyStr = JSON.stringify(req.body);

  // Detect tool function by name or parameter signature
  let functionName = null;
  if (bodyStr.includes('verify_customer') || bodyStr.includes('verification_input') || bodyStr.includes('dob_year')) {
    functionName = 'verify_customer';
  } else if (bodyStr.includes('log_promise_to_pay') || bodyStr.includes('promised_date') || bodyStr.includes('promised_amount')) {
    functionName = 'log_promise_to_pay';
  } else if (bodyStr.includes('send_payment_link') || bodyStr.includes('channel')) {
    functionName = 'send_payment_link';
  } else if (bodyStr.includes('mark_disposition') || bodyStr.includes('disposition_code')) {
    functionName = 'mark_disposition';
  }

  if (!functionName) return null;

  const message = req.body.message || req.body;
  const rawToolObj = (message.toolCalls && message.toolCalls[0]) ||
    (message.toolCallList && message.toolCallList[0]) ||
    (message.toolWithToolCallList && message.toolWithToolCallList[0]?.toolCall) ||
    message.functionCall ||
    message;

  const toolCallId = rawToolObj?.toolCallId || rawToolObj?.id || message?.toolCallId || message?.id || req.body?.toolCallId || req.body?.id || "tool_call_1";
  const rawFunc = rawToolObj?.function || rawToolObj;

  let args = {};
  const candidates = [
    rawToolObj?.arguments,
    rawToolObj?.body,
    rawFunc?.arguments,
    rawFunc?.body,
    message?.toolCalls?.[0]?.function?.arguments,
    message?.toolWithToolCallList?.[0]?.toolCall?.function?.arguments,
    message?.arguments,
    message?.body,
    req.body?.arguments,
    req.body?.body
  ];

  for (const cand of candidates) {
    if (cand && typeof cand === 'object' && Object.keys(cand).length > 0) {
      args = cand;
      break;
    } else if (cand && typeof cand === 'string') {
      try {
        const parsed = JSON.parse(cand);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          args = parsed;
          break;
        }
      } catch (e) {}
    }
  }

  return { functionName, toolCallId, args, bodyStr };
}

/**
 * Dispatches an instant payment link notification via Telegram Bot API.
 */
async function dispatchTelegramNotification(chatId, botToken, paymentUrl, amount) {
  if (!botToken || !chatId) return;

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const textMsg = `💳 Kapture Finance Payment Link\n\nDear Akhil,\nYour EMI of ₹${amount.toLocaleString('en-IN')} is overdue by 12 days. Please click the secure link below to complete your payment:\n\n🔗 ${paymentUrl}\n\nThank you for choosing Kapture Finance.`;

  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMsg
      })
    });
    const data = await response.json();
    console.log(`Telegram dispatch status for Chat ID [${chatId}]:`, data);
  } catch (e) {
    console.error('Telegram dispatch error:', e.message);
  }
}

// ==========================================
// 3. TOOL BUSINESS LOGIC HANDLERS
// ==========================================

function handleVerifyCustomer(args, bodyStr) {
  const customerId = args.customer_id || 'CUST_9942';
  const customer = CUSTOMER_DB[customerId] || CUSTOMER_DB['CUST_9942'];
  
  // Build search text from parameters (excluding customer ID to prevent false matches)
  const verificationArgs = { ...args };
  delete verificationArgs.customer_id;
  delete verificationArgs.customerId;

  let searchString = Object.values(verificationArgs).map(v => String(v)).join(' ').toLowerCase();

  // Fallback: If arguments do not contain a 4-digit number, search full request body (transcript)
  if (!searchString.match(/\d{4}/) && !searchString.includes('two thousand five')) {
    searchString += ' ' + bodyStr.toLowerCase();
  }

  // Clean out customer_id numbers (9942)
  searchString = searchString.replace(/cust_9942/g, '').replace(/9942/g, '');

  // Extract 4-digit number
  const digitMatch = searchString.match(/\b\d{4}\b/) || searchString.match(/\d{4}/);
  const extractedDigits = digitMatch ? digitMatch[0] : '';

  const isVerified = (
    (extractedDigits && (extractedDigits === customer.dob_year || extractedDigits === customer.last4_mobile)) ||
    searchString.includes(customer.dob_year) ||
    searchString.includes(customer.last4_mobile) ||
    searchString.includes('two thousand five') ||
    searchString.includes('twenty zero five') ||
    searchString.includes('three two one zero')
  );

  console.log(`Verification result for customer [${customerId}]: Extracted digits [${extractedDigits}] => Verified: ${isVerified}`);

  if (isVerified) {
    return {
      verified: true,
      is_verified: true,
      status: "verified",
      customer_name: customer.name,
      overdue_amount: customer.overdue_amount,
      days_overdue: customer.days_overdue,
      due_date: customer.due_date,
      loan_type: customer.loan_type,
      message: "Identity verified successfully. Overdue EMI details unlocked."
    };
  }

  return {
    verified: false,
    is_verified: false,
    status: "failed",
    message: "Verification failed. Details do not match CRM records."
  };
}

function handleLogPromiseToPay(args) {
  const customerId = args.customer_id || 'CUST_9942';
  const promisedDate = args.promised_date || '2026-08-18';
  const promisedAmount = args.promised_amount || 8499;

  return {
    status: "success",
    ptp_id: `PTP_${Math.floor(10000 + Math.random() * 90000)}`,
    customer_id: customerId,
    promised_date: promisedDate,
    promised_amount: promisedAmount,
    message: `Promise to Pay recorded for ₹${promisedAmount} on ${promisedDate}.`
  };
}

async function handleSendPaymentLink(args) {
  const customerId = args.customer_id || 'CUST_9942';
  const channel = args.channel || 'Telegram';
  const amount = args.amount || 8499;
  const paymentUrl = `https://pay.kapture.fi/emi/${amount}`;

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8841894222:AAGycq_haCs1Pze5lc3kpZdPK1gBQdsZbTk';
  const chatId = process.env.TELEGRAM_CHAT_ID || '1454696587';

  // Await Telegram notification dispatch before returning (required for serverless functions)
  await dispatchTelegramNotification(chatId, botToken, paymentUrl, amount);

  return {
    status: "sent",
    channel: channel,
    payment_url: paymentUrl,
    timestamp: new Date().toISOString(),
    message: `Payment link of ₹${amount} successfully dispatched via ${channel} & Telegram.`
  };
}

function handleMarkDisposition(args) {
  const customerId = args.customer_id || 'CUST_9942';
  const dispositionCode = args.disposition_code || 'PTP_AGREED';
  const notes = args.notes || 'Call completed successfully';

  return {
    status: "logged",
    call_id: `CALL_${Math.floor(100000 + Math.random() * 900000)}`,
    customer_id: customerId,
    disposition_code: dispositionCode,
    call_contained: args.call_contained ?? true,
    notes: notes,
    timestamp: new Date().toISOString()
  };
}

// ==========================================
// 4. API ROUTES
// ==========================================

// Health Check Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Kapture Finance Voicebot Webhook API',
    timestamp: new Date().toISOString()
  });
});

// Unified Vapi Tool Call Webhook Handler
app.post('/api/webhook', async (req, res) => {
  const extracted = extractToolCallMetadata(req);

  if (!extracted) {
    console.log('Non-tool / status update event received by webhook');
    return res.status(200).json({
      status: 'ok',
      message: 'Webhook event received successfully'
    });
  }

  const { functionName, toolCallId, args, bodyStr } = extracted;
  console.log(`Executing Tool: [${functionName}] | toolCallId: [${toolCallId}] | arguments:`, args);

  let responseData = {};

  switch (functionName) {
    case 'verify_customer':
      responseData = handleVerifyCustomer(args, bodyStr);
      break;
    case 'log_promise_to_pay':
      responseData = handleLogPromiseToPay(args);
      break;
    case 'send_payment_link':
      responseData = await handleSendPaymentLink(args);
      break;
    case 'mark_disposition':
      responseData = handleMarkDisposition(args);
      break;
    default:
      responseData = {
        status: "unknown_function",
        message: `Function ${functionName} is not supported.`
      };
  }

  console.log(`Tool Result [${functionName}]:`, responseData);

  // Vapi documentation requirement: result field inside results array MUST be a string
  const resultString = typeof responseData === 'string'
    ? responseData
    : JSON.stringify(responseData);

  return res.status(200).json({
    results: [
      {
        toolCallId: toolCallId,
        result: resultString
      }
    ]
  });
});

// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Kapture Finance Webhook Server running on port ${PORT}`);
    console.log(`🔗 Local Endpoint: http://localhost:${PORT}/api/webhook\n`);
  });
}

module.exports = app;
