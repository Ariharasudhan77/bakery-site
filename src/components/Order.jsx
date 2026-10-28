import { useEffect, useState } from 'react';
import { MENU } from '../data/menu';

function MyOrders({ version }) {
  const [orders, setOrders] = useState(null);
  const [tick, setTick] = useState(0);

  // Retrieve this customer's saved orders from the server
  useEffect(() => {
    let alive = true;
    fetch('/api/orders/mine')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => alive && setOrders(d.orders))
      .catch(() => alive && setOrders([]));
    return () => { alive = false; };
  }, [version, tick]);

  return (
    <div className="panel">
      <div className="past-head">
        <h3>Your recent orders</h3>
        <button type="button" className="link-btn" onClick={() => setTick(tick + 1)}>Refresh</button>
      </div>
      {orders === null ? (
        <p className="empty">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="empty">No orders yet. Your orders will appear here.</p>
      ) : (
        orders.map((o) => (
          <div className="past" key={o.orderId}>
            <div className="line">
              <b>{o.orderId}</b>
              <span>₹{o.total}</span>
            </div>
            <small>{new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small>
            <div>{o.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ')}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function Order({ cart, clear, user, onExpired }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const lines = MENU.filter((m) => cart[m.id]);
  const total = lines.reduce((sum, m) => sum + m.price * cart[m.id], 0);
  const ready = lines.length > 0 && name.trim() && phone.trim();

  const edit = (setter) => (e) => { setter(e.target.value); setOrderId(''); setError(''); };

  const send = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, cart }),
      });
      if (res.status === 401) { onExpired?.(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place the order.');
      setOrderId(data.orderId);
      setVersion((v) => v + 1);
      clear();
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'Could not reach the server. Is it running?' : e.message);
    }
    setLoading(false);
  };

  return (
    <section id="order">
      <div className="wrap order">
        <div className="panel">
          <h3>Your order</h3>
          {lines.length === 0 ? (
            <p className="empty">Nothing here yet. Add something from the menu, or tell the chat assistant what you’d like.</p>
          ) : (
            <>
              {lines.map((m) => (
                <div className="line" key={m.id}>
                  <span>{cart[m.id]} × {m.name}</span><span>₹{m.price * cart[m.id]}</span>
                </div>
              ))}
              <div className="line total"><span>Total</span><span>₹{total}</span></div>
            </>
          )}
        </div>
        <div className="panel">
          <h3>Pick up tomorrow</h3>
          <label>Your name<input value={name} onChange={edit(setName)} autoComplete="name" /></label>
          <label>Phone number<input value={phone} onChange={edit(setPhone)} inputMode="tel" autoComplete="tel" /></label>
          <button className="btn main" disabled={!ready || loading} style={{ opacity: ready && !loading ? 1 : 0.45, cursor: ready && !loading ? 'pointer' : 'not-allowed' }} onClick={send}>
            {loading ? 'Placing…' : 'Place order'}
          </button>
          {orderId && <div className="ok" role="status">Order {orderId} placed. We’ll text you when it’s ready to collect.</div>}
          {error && <div className="ok bad" role="alert">{error}</div>}
        </div>
      </div>
      <div className="wrap" style={{ marginTop: '1.5rem' }}>
        <MyOrders version={version} />
      </div>
    </section>
  );
}
