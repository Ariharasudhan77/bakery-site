import { useState, useMemo } from 'react';
import { MENU } from '../data/menu';

function Thumb({ item }) {
  const [failed, setFailed] = useState(false);
  if (!item.image || failed) {
    return <div className="thumb" aria-hidden="true">{item.icon}</div>;
  }
  return (
    <div className="thumb has-img">
      <img src={item.image} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

export default function Menu({ cart, setQty }) {
  const [cat, setCat] = useState("All");
  const cats = ["All", "Bread", "Pastry", "Cakes"];
  const items = useMemo(() => MENU.filter(m => cat === "All" || m.cat === cat), [cat]);
  return (
    <section id="menu">
      <div className="wrap">
        <div className="head">
          <h2>Today’s menu</h2>
          <div className="tabs" role="group" aria-label="Filter menu">
            {cats.map(c => (
              <button key={c} className="tab" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="grid">
          {items.map(m => (
            <article className="card" key={m.id}>
              <Thumb item={m} />
              <h3>{m.name}</h3>
              <p>{m.note}</p>
              <div className="row">
                <span className="price">₹{m.price}</span>
                {cart[m.id] ? (
                  <div className="qty">
                    <button aria-label={"Remove one " + m.name} onClick={() => setQty(m.id, cart[m.id] - 1)}>−</button>
                    <b>{cart[m.id]}</b>
                    <button aria-label={"Add one " + m.name} onClick={() => setQty(m.id, cart[m.id] + 1)}>+</button>
                  </div>
                ) : (
                  <button className="add" onClick={() => setQty(m.id, 1)}>Add</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
