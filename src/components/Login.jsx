import { useState } from 'react';
import '../styles/login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{7,16}$/;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRegister = mode === 'register';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const found = {};
    if (isRegister && form.name.trim().length < 2) found.name = 'Enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (isRegister && !PHONE_RE.test(form.phone.trim())) found.phone = 'Enter a valid phone number.';
    if (isRegister ? form.password.length < 8 : form.password.length < 1) {
      found.password = isRegister ? 'Password must be at least 8 characters.' : 'Enter your password.';
    }
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      // The server saves new accounts (register) or checks the stored account (login)
      const res = await fetch('/api/auth/' + (isRegister ? 'register' : 'login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: form.email.trim(), remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields || {});
        setFormError(data.error || 'Something went wrong. Please try again.');
      } else {
        onLogin(data.user);
      }
    } catch {
      setFormError('Can’t reach the server. Make sure it is running (npm run start:all).');
    }
    setLoading(false);
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setErrors({});
    setFormError('');
  };

  const field = (key, label, props = {}) => (
    <>
      <label htmlFor={key}>
        {label}
        <input
          id={key}
          value={form[key]}
          onChange={set(key)}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? key + '-err' : undefined}
          {...props}
        />
      </label>
      {errors[key] && <p className="field-err" id={key + '-err'} role="alert">{errors[key]}</p>}
    </>
  );

  return (
    <main className="login">
      <aside className="login-side">
        <div className="flogo">Pistachio <span>&amp;</span> Rye</div>
        <div>
          <h1>{isRegister ? 'Join us.' : 'Welcome back.'}</h1>
          <p>{isRegister ? 'Create an account to order ahead and keep track of your orders.' : 'Sign in to order ahead and skip the queue.'}</p>
        </div>
        <small>Baked fresh every morning from 6:30 am.</small>
      </aside>

      <section className="login-main">
        <form className="login-card" onSubmit={submit} noValidate>
          <h2>{isRegister ? 'Create account' : 'Sign in'}</h2>
          <p className="login-sub">{isRegister ? 'It takes less than a minute.' : 'Use the email you registered with.'}</p>

          {formError && <div className="login-error" role="alert">{formError}</div>}

          {isRegister && field('name', 'Full name', { autoComplete: 'name' })}
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {isRegister && field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}

          <label htmlFor="password">
            Password
            <div className="pw">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-err' : undefined}
              />
              <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-pressed={show}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {errors.password && <p className="field-err" id="password-err" role="alert">{errors.password}</p>}

          <div className="login-row">
            <label className="check" htmlFor="remember">
              <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Keep me signed in
            </label>
          </div>

          <button className="btn main login-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>

          <p className="login-foot">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <button type="button" className="link-btn" onClick={switchMode}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
