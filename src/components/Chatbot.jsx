import { useEffect, useRef, useState } from 'react';
import { getReply } from '../chatbot/getReply';
import '../styles/chatbot.css';

const QUICK = [{ label: 'Today’s menu' }, { label: 'What’s fresh next?' }, { label: 'Opening hours' }, { label: 'I want to order' }];
const AFTER = [{ label: 'My order' }, { label: 'Place my order' }, { label: 'Opening hours' }];

const WELCOME = {
  from: 'bot',
  text: 'Hi! I’m the Pistachio & Rye assistant. Ask me anything about our menu or timings, or just tell me what you’d like to order.',
  chips: QUICK,
};

// Sends the chat to the server and reads the answer as it streams in.
async function streamChat({ history, cart, onToken, onCart }) {
  const now = new Date();
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart,
      clientNow: { day: now.getDay(), hour: now.getHours() + now.getMinutes() / 60 },
      messages: history.filter((m) => m.text).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })),
    }),
  });
  if (res.status === 401) throw new Error('AUTH');
  if (!res.ok || !res.body) throw new Error('Server error ' + res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = {};
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === 'token') onToken(payload.text);
      else if (event === 'cart') onCart(payload.cart);
      else if (event === 'done') final = payload;
      else if (event === 'error') throw new Error(payload.error);
    }
  }
  return final;
}

export default function Chatbot({ cart, setQty, setCart, onExpired }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = async (raw) => {
    const text = raw.trim();
    if (!text || busy) return;
    const history = [...messages, { from: 'user', text }];
    setMessages([...history, { from: 'bot', text: '', pending: true }]);
    setInput('');
    setBusy(true);

    const patchLast = (fn) => setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));
    try {
      const final = await streamChat({
        history,
        cart,
        onToken: (t) => patchLast((m) => ({ ...m, text: m.text + t })),
        onCart: (c) => setCart(c),
      });
      patchLast((m) => ({ ...m, pending: false, sources: final.sources, chips: AFTER }));
    } catch (err) {
      if (err.message === 'AUTH') {
        patchLast(() => ({ from: 'bot', text: 'Your session has expired. Please sign in again.' }));
        onExpired?.();
        setBusy(false);
        return;
      }
      // Server not reachable: fall back to the simple built-in answers
      const rule = getReply(text, { cart });
      if (rule.add) rule.add.forEach(({ id, qty }) => setQty(id, (cart[id] || 0) + qty));
      patchLast(() => ({
        from: 'bot',
        text: rule.fallback ? 'I can’t reach the assistant right now. Please try again in a moment, or call us.' : rule.text,
        chips: rule.chips,
      }));
    }
    setBusy(false);
  };

  const pressChip = (chip) => {
    if (chip.href) {
      document.querySelector(chip.href)?.scrollIntoView({ behavior: 'smooth' });
      setOpen(false);
    } else {
      send(chip.send || chip.label);
    }
  };

  if (!open) {
    return (
      <button className="chat-launch" onClick={() => setOpen(true)} aria-label="Open chat">
        <span aria-hidden="true">💬</span> Chat with us
      </button>
    );
  }

  const last = messages[messages.length - 1];

  return (
    <div className="chat" role="dialog" aria-label="Chat with Pistachio & Rye" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <div className="chat-head">
        <div>
          <b>Pistachio &amp; Rye</b>
          <small>Ask a question or order right here</small>
        </div>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
      </div>

      <div className="chat-body" ref={bodyRef} aria-live="polite">
        {messages.map((m, i) =>
          m.pending && !m.text ? (
            <div key={i} className="msg bot typing" aria-label="Typing"><i /><i /><i /></div>
          ) : (
            <div key={i} className={'msg ' + m.from}>
              {m.text}
              {m.sources && m.sources.length > 0 && !m.pending && <small className="src">Sources: {m.sources.join(', ')}</small>}
            </div>
          )
        )}
        {!busy && last.from === 'bot' && last.chips && (
          <div className="chips">
            {last.chips.map((c) => (
              <button key={c.label} className="chip" onClick={() => pressChip(c)}>{c.label}</button>
            ))}
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" aria-label="Your message" />
        <button className="btn main" type="submit" disabled={!input.trim() || busy}>Send</button>
      </form>
    </div>
  );
}
