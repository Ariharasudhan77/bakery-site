import { useState } from 'react';

export default function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header>
      <div className="wrap bar">
        <a className="logo" href="#top">Pistachio <span>&amp;</span> Rye</a>
        <button className="burger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "✕" : "☰"}
        </button>
        <nav className={open ? "open" : ""}>
          <a href="#menu" onClick={close}>Menu</a>
          <a href="#about" onClick={close}>Our bakery</a>
          <a href="#order" onClick={close}>Your order</a>
          <a className="pill" href="#order" onClick={close}>Order ahead</a>
          <span className="hello">Hi, {user.name.split(' ')[0]}</span>
          <button className="signout" onClick={() => { close(); onLogout(); }}>Sign out</button>
        </nav>
      </div>
    </header>
  );
}
