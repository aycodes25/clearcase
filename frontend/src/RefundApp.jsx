import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import './RefundApp.css';

const API = '/api';

function Shell({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          clear<span>case</span>
        </Link>
        <nav className="nav">
          <NavLink to="/request">Customer request</NavLink>
          <NavLink to="/support">Support desk</NavLink>
        </nav>
      </header>
      {children}
    </div>
  );
}

function RequestPage() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    orderId: '',
    reason: 'damaged',
    message: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/customers`)
      .then((response) => response.json())
      .then((items) => {
        setCustomers(items);
        setForm((current) => ({
          ...current,
          customerId: items[0]?.id || '',
        }));
      });
  }, []);

  useEffect(() => {
    if (!form.customerId) return;

    fetch(`${API}/customers/${form.customerId}/orders`)
      .then((response) => response.json())
      .then((items) => {
        setOrders(items);
        setForm((current) => ({
          ...current,
          orderId: items[0]?.id || '',
        }));
      });
  }, [form.customerId]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API}/refund-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error);
      setResult(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <span className="eyebrow">Customer care / refund request</span>
      <h1>A fair answer, without the waiting.</h1>
      <p className="lede">
        Tell us what happened. Clearcase checks your order against the refund
        policy and gives you an immediate, explainable next step.
      </p>

      <div className="layout">
        <section className="panel">
          <h2>Start a request</h2>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="customer">Customer</label>
              <select
                id="customer"
                value={form.customerId}
                onChange={(event) =>
                  setForm({ ...form, customerId: event.target.value })
                }
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="order">Order</label>
              <select
                id="order"
                value={form.orderId}
                onChange={(event) =>
                  setForm({ ...form, orderId: event.target.value })
                }
              >
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id} · {order.item} · ${order.amount}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="reason">Reason</label>
              <select
                id="reason"
                value={form.reason}
                onChange={(event) =>
                  setForm({ ...form, reason: event.target.value })
                }
              >
                <option value="damaged">Arrived damaged</option>
                <option value="incorrect">Incorrect item</option>
                <option value="changed-mind">Changed my mind</option>
                <option value="suspicious">Something seems wrong</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="message">What happened?</label>
              <textarea
                id="message"
                required
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                placeholder="Share the details that will help our team understand the request."
              />
            </div>

            <button className="primary" disabled={loading}>
              {loading ? 'Reviewing request...' : 'Submit for review'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {result && (
            <div className={`result ${result.decision.toLowerCase()}`}>
              <div className="result-head">
                <h3>
                  {result.decision === 'APPROVED'
                    ? 'Refund approved'
                    : result.decision === 'DENIED'
                      ? 'Refund not eligible'
                      : 'Support review needed'}
                </h3>
                <span className={`badge ${result.decision}`}>
                  {result.decision}
                </span>
              </div>
              <p>{result.aiNote}</p>
              <ul>
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="side-note">
          <h3>How the review works</h3>
          <ul>
            <li>
              <strong>01 / Check the order</strong>
              We verify the customer and order match.
            </li>
            <li>
              <strong>02 / Apply the policy</strong>
              Rules determine eligibility and when a human must review.
            </li>
            <li>
              <strong>03 / Explain the outcome</strong>
              AI helps turn the audit trail into a clear response.
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

function SupportPage() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetch(`${API}/refund-requests`)
      .then((response) => response.json())
      .then(setRequests);
  }, []);

  const counts = ['APPROVED', 'ESCALATED', 'DENIED'].map((decision) =>
    requests.filter((item) => item.decision === decision).length,
  );

  return (
    <main className="page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Operations / support desk</span>
          <h1>Decisions, in view.</h1>
          <p className="lede">
            A compact audit trail for every customer request and the policy
            signal behind it.
          </p>
        </div>
        <Link className="primary" to="/request">
          New request
        </Link>
      </div>

      <div className="stats">
        <div className="stat">
          <strong>{requests.length}</strong>
          <span>Total requests</span>
        </div>
        <div className="stat">
          <strong>{counts[1]}</strong>
          <span>Need human review</span>
        </div>
        <div className="stat">
          <strong>{counts[0]}</strong>
          <span>Approved automatically</span>
        </div>
      </div>

      <section className="panel">
        <h2>Recent requests</h2>
        {requests.length === 0 ? (
          <p className="muted">
            No requests yet. Submit one from the customer view to populate the
            audit trail.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="request-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Order</th>
                  <th>Decision</th>
                  <th>Policy notes</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.id}</strong>
                      <br />
                      <span className="muted">
                        {new Date(request.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {request.orderId}
                      <br />
                      <span className="muted">{request.reason}</span>
                    </td>
                    <td>
                      <span className={`badge ${request.decision}`}>
                        {request.decision}
                      </span>
                    </td>
                    <td>{request.reasons.join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default function RefundApp() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<RequestPage />} />
        <Route path="/request" element={<RequestPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Routes>
    </Shell>
  );
}