const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const dataDirectory = path.join(__dirname, '..', '..', 'data');

app.use(cors());
app.use(express.json());

async function readJson(fileName, fallback = []) {
  try {
    const contents = await fs.readFile(path.join(dataDirectory, fileName), 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(fileName, value) {
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(path.join(dataDirectory, fileName), contents);
}

function containsInjection(text) {
  return (
    /ignore\s+(all|any|the)\s+(previous|above)/i.test(text) ||
    /reveal\s+(your|the)\s+(system|hidden)\s+prompt/i.test(text) ||
    /bypass\s+(the|this)\s+policy/i.test(text)
  );
}

function evaluatePolicy(order, request) {
  const reasons = [];
  const amount = Number(order?.amount || 0);
  const orderAgeDays = order
    ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000)
    : Infinity;
  const policyWindow = 30;

  if (!order) {
    return {
      decision: 'ESCALATED',
      reasons: ['Order could not be matched to the supplied customer details.'],
    };
  }
  if (containsInjection(request.message)) {
    return {
      decision: 'ESCALATED',
      reasons: ['The request contains language attempting to override system policy.'],
    };
  }
  if (order.finalSale) {
    return {
      decision: 'DENIED',
      reasons: ['This order is marked final sale and is not eligible for a refund.'],
    };
  }
  if (orderAgeDays > policyWindow) {
    return {
      decision: 'DENIED',
      reasons: [`The order is older than the ${policyWindow}-day refund window.`],
    };
  }
  if (amount > 500) {
    reasons.push('Refunds above $500 require human review.');
  }
  if (request.reason === 'damaged' || request.reason === 'incorrect') {
    reasons.push('Damaged or incorrect items qualify for review under the policy.');
  }
  if (request.reason === 'suspicious' || request.message.length < 15) {
    reasons.push(
      'The request needs additional context before a refund decision can be made.',
    );
  }

  const requiresReview =
    amount > 500 || request.reason === 'suspicious' || request.message.length < 15;

  return {
    decision: requiresReview ? 'ESCALATED' : 'APPROVED',
    reasons,
  };
}

async function createAiNote(policyResult, request, customer, order) {
  if (!process.env.OPENAI_API_KEY) {
    return 'Demo mode: deterministic policy evaluation was used because OPENAI_API_KEY is not configured.';
  }
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a support assistant. Summarize the already-computed refund decision in ' +
          'two concise sentences. Never change the decision or refund policy.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          decision: policyResult.decision,
          reasons: policyResult.reasons,
          request,
          customer,
          order,
        }),
      },
    ],
  });
  return response.output_text;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/refund-requests', async (req, res, next) => {
  try {
    res.json(await readJson('refund-requests.json'));
  } catch (error) { next(error); }
});

app.post('/api/refund-requests', async (req, res, next) => {
  try {
    const { customerId, orderId, reason, message } = req.body;
    if (!customerId || !orderId || !reason || !message) {
      return res.status(400).json({
        error: 'customerId, orderId, reason, and message are required.',
      });
    }
    const [customers, orders, requests] = await Promise.all([
      readJson('customers.json'),
      readJson('orders.json'),
      readJson('refund-requests.json'),
    ]);
    const customer = customers.find((item) => item.id === customerId);
    const order = orders.find((item) => item.id === orderId && item.customerId === customerId);
    const policyResult = evaluatePolicy(order, { reason, message });
    const aiNote = await createAiNote(policyResult, { reason, message }, customer, order);
    const refundRequest = {
      id: `rr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customerId,
      orderId,
      reason,
      message,
      decision: policyResult.decision,
      reasons: policyResult.reasons,
      aiNote,
    };
    await writeJson('refund-requests.json', [refundRequest, ...requests]);
    res.status(201).json({ ...refundRequest, customer, order });
  } catch (error) {
    next(error);
  }
});

app.get('/api/customers', async (req, res, next) => {
  try {
    res.json(await readJson('customers.json'));
  } catch (error) {
    next(error);
  }
});

app.get('/api/customers/:customerId/orders', async (req, res, next) => {
  try {
    const orders = await readJson('orders.json');
    res.json(orders.filter((order) => order.customerId === req.params.customerId));
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'The refund service could not complete the request.' });
});

app.listen(port, () => console.log(`Refund API listening on port ${port}`));

module.exports = { app, evaluatePolicy };