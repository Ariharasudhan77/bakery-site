import { useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Menu from './components/Menu';
import About from './components/About';
import Order from './components/Order';
import Footer from './components/Footer';
import Login from './components/Login';
import Chatbot from './components/Chatbot';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [cart, setCart] = useState({});
  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });

  // On load, ask the server whether this browser already has a valid session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setUser(null);
    setCart({});
  };

  if (checking) return <div className="boot" aria-busy="true">Loading…</div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <Header user={user} onLogout={logout} />
      <main>
        <Hero />
        <Menu cart={cart} setQty={setQty} />
        <About />
        <Order cart={cart} user={user} clear={() => setCart({})} onExpired={() => setUser(null)} />
      </main>
      <Footer />
      <Chatbot cart={cart} setQty={setQty} setCart={setCart} onExpired={() => setUser(null)} />
    </>
  );
}
