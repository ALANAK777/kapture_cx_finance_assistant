require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock In-Memory Customer Database
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
  // Universal tool call detection
  const knownTools = ['verify_customer', 'log_promise_to_pay', 'send_payment_link', 'mark_disposition'];
  const bodyStr = JSON.stringify(req.body);
  const functionName = knownTools.find(t => bodyStr.includes(t));

  if (!functionName) {
    console.log('Status update / non-tool event received by webhook');
    return res.status(200).json({
      status: 'ok',
      message: 'Webhook event received successfully'
    });
  }

  // Extract message & tool call metadata
  const message = req.body.message || req.body;
  const rawToolObj = (message.toolCalls && message.toolCalls[0]) ||
                    (message.toolCallList && message.toolCallList[0]) ||
                    message.functionCall ||
                    message;

  const toolCallId = rawToolObj?.toolCallId || rawToolObj?.id || message?.toolCallId || message?.id || req.body?.toolCallId || req.body?.id || "tool_call_1";
  const rawFunc = rawToolObj?.function || rawToolObj;

  let args = {};
  if (rawFunc && rawFunc.arguments) {
    try {
      args = typeof rawFunc.arguments === 'string' ? JSON.parse(rawFunc.arguments) : rawFunc.arguments;
    } catch (e) {
      args = rawFunc.arguments || {};
    }
  } else if (message.arguments) {
    try {
      args = typeof message.arguments === 'string' ? JSON.parse(message.arguments) : message.arguments;
    } catch (e) {
      args = message.arguments || {};
    }
  }

  console.log(`Executing Tool: [${functionName}] with toolCallId: [${toolCallId}] and arguments:`, args);

  let responseData = {};

  switch (functionName) {
    case 'verify_customer': {
      const customerId = args.customer_id || 'CUST_9942';
      const customer = CUSTOMER_DB[customerId] || CUSTOMER_DB['CUST_9942'];
      
      // Collect all argument values passed by LLM into one string
      const allArgsString = Object.values(args).map(v => String(v)).join(' ').toLowerCase();

      // Extract any 4-digit number from any parameter
      const digitMatch = allArgsString.match(/\d{4}/);
      const extractedDigits = digitMatch ? digitMatch[0] : '';

      const isVerified = (
        extractedDigits === customer.dob_year ||
        extractedDigits === customer.last4_mobile ||
        allArgsString.includes(customer.dob_year) ||
        allArgsString.includes(customer.last4_mobile) ||
        allArgsString.includes('two thousand five')
      );

      console.log(`Verification input check: extracted [${extractedDigits}] from args:`, args, `=> Verified: ${isVerified}`);

      if (isVerified) {
        responseData = {
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
      } else {
        responseData = {
          verified: false,
          is_verified: false,
          status: "failed",
          message: "Verification failed. Details do not match CRM records."
        };
      }
      break;
    }

    case 'log_promise_to_pay': {
      const customerId = args.customer_id || 'CUST_9942';
      const promisedDate = args.promised_date || '2026-08-18';
      const promisedAmount = args.promised_amount || 8499;

      responseData = {
        status: "success",
        ptp_id: `PTP_${Math.floor(10000 + Math.random() * 90000)}`,
        customer_id: customerId,
        promised_date: promisedDate,
        promised_amount: promisedAmount,
        message: `Promise to Pay recorded for ₹${promisedAmount} on ${promisedDate}.`
      };
      break;
    }

    case 'send_payment_link': {
      const customerId = args.customer_id || 'CUST_9942';
      const channel = args.channel || 'Telegram';
      const amount = args.amount || 8499;
      const paymentUrl = `https://pay.kapture.fi/emi/${amount}`;

      // Telegram notification integration (if credentials set in .env)
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (botToken && chatId) {
        try {
          const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const tgRes = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `📩 *Kapture Finance Payment Link*\n\nDear Customer, your EMI of ₹${amount} is overdue. Click to pay securely:\n${paymentUrl}`,
              parse_mode: 'Markdown'
            })
          });
          const tgData = await tgRes.json();
          console.log('Telegram API Response:', tgData);
        } catch (e) {
          console.error('Failed to trigger Telegram notification:', e.message);
        }
      }

      responseData = {
        status: "sent",
        channel: channel,
        payment_url: paymentUrl,
        timestamp: new Date().toISOString(),
        message: `Payment link of ₹${amount} successfully dispatched via ${channel}${botToken ? ' & Telegram' : ''}.`
      };
      break;
    }

    case 'mark_disposition': {
      const customerId = args.customer_id || 'CUST_9942';
      const dispositionCode = args.disposition_code || 'PTP_AGREED';
      const notes = args.notes || 'Call completed successfully';

      responseData = {
        status: "logged",
        call_id: `CALL_${Math.floor(100000 + Math.random() * 900000)}`,
        customer_id: customerId,
        disposition_code: dispositionCode,
        call_contained: args.call_contained ?? true,
        notes: notes,
        timestamp: new Date().toISOString()
      };
      break;
    }

    default:
      responseData = {
        status: "unknown_function",
        message: `Function ${functionName} is not supported.`
      };
  }

  console.log(`Tool Result for ${functionName}:`, responseData);

  // Return standard Vapi tool response format with top-level fallback flags
  return res.status(200).json({
    verified: responseData.verified ?? true,
    is_verified: responseData.is_verified ?? true,
    status: responseData.status || "success",
    results: [
      {
        toolCallId: toolCallId,
        result: responseData
      }
    ],
    result: responseData
  });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Kapture Finance Webhook Server running locally on port ${PORT}`);
    console.log(`🔗 Local Endpoint: http://localhost:${PORT}/api/webhook`);
    console.log(`💡 Expose with ngrok: ngrok http ${PORT}\n`);
  });
}

module.exports = app;
