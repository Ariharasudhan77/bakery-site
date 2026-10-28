import { MENU, OVEN } from '../data/menu';

// Edit these to match your real bakery.
const HOURS = 'Tuesday to Sunday, 6:30 am to 8:00 pm. We’re closed on Mondays.';
const CONTACT = '12 Baker Street, Your City\nPhone: +91 00000 00000\nEmail: hello@pistachioandrye.example';

const STOP_WORDS = ['loaf', 'butter', 'dark'];
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const rupee = (n) => '₹' + n;

// "Butter croissant" -> ["croissant"], "Milk buns (6)" -> ["milk", "bun"]
function tokens(item) {
  return item.name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.includes(w))
    .map((w) => w.replace(/s$/, ''));
}

const findItems = (text) =>
  MENU.filter((m) => tokens(m).some((t) => new RegExp('\\b' + t + 's?\\b').test(text)));

function qtyFor(text, item, single) {
  const nums = '\\d{1,2}|' + Object.keys(NUMBER_WORDS).join('|');
  for (const t of tokens(item)) {
    const m = text.match(new RegExp('\\b(' + nums + ')\\s*x?\\s*(?:[a-z]+\\s+)?' + t + 's?\\b'));
    if (m) return Math.min(NUMBER_WORDS[m[1]] || Number(m[1]), 20);
  }
  const lone = single && text.match(/\b(\d{1,2})\b/);
  return lone ? Math.min(Number(lone[1]), 20) : 1;
}

const plainName = (m) => m.name.replace(/\s*\(.*?\)/, '');
const line = (m) => `${m.icon} ${m.name} · ${rupee(m.price)}`;

function openStatus() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const open = now.getDay() !== 1 && hour >= 6.5 && hour < 20;
  return open ? 'We’re open right now.' : 'We’re closed right now.';
}

function nextBatch() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const upcoming = OVEN.filter((o) => o.h > hour);
  if (upcoming.length === 0) {
    return `Today’s batches are all out. Tomorrow starts with ${OVEN[0].item.toLowerCase()} at ${OVEN[0].label}.`;
  }
  const rest = upcoming.slice(1).map((o) => `${o.label}: ${o.item}`).join('\n');
  return `Next out of the oven: ${upcoming[0].item.toLowerCase()} at ${upcoming[0].label}.` + (rest ? `\n\nLater today:\n${rest}` : '');
}

function orderSummary(cart) {
  const lines = MENU.filter((m) => cart[m.id]);
  if (lines.length === 0) {
    return { text: 'Your order is empty for now. Want to see today’s menu?', chips: [{ label: 'Today’s menu' }], local: true };
  }
  const total = lines.reduce((sum, m) => sum + m.price * cart[m.id], 0);
  const text = lines.map((m) => `${cart[m.id]} × ${m.name} · ${rupee(m.price * cart[m.id])}`).join('\n')
    + `\n\nTotal: ${rupee(total)}\nOrder by 6 pm to collect tomorrow morning.`;
  return { text, chips: [{ label: 'Go to checkout', href: '#order' }], local: true };
}

const CATEGORY_CHIPS = [{ label: 'Bread' }, { label: 'Pastry' }, { label: 'Cakes' }, { label: 'My order' }];

// Takes what the customer typed and the current cart.
// Returns { text, chips?, add?, local?, fallback? }. add = [{ id, qty }] items to put in the cart.
// local = a cart action the browser handles itself. fallback = no rule matched.
export function getReply(input, { cart }) {
  const t = input.toLowerCase().replace(/[’]/g, "'").trim();
  const items = findItems(t);
  const wantsToAdd = /\b(add|order|want|get|buy|take|give)\b|\bi'?d like\b/.test(t);

  // 1. Add items to the order
  if (items.length > 0 && wantsToAdd) {
    const add = items.map((m) => ({ id: m.id, qty: qtyFor(t, m, items.length === 1) }));
    const list = add.map((a) => `${a.qty} × ${MENU.find((m) => m.id === a.id).name}`).join(', ');
    return {
      text: `Added ${list} to your order.`,
      add,
      local: true,
      chips: [{ label: 'My order' }, { label: 'Go to checkout', href: '#order' }],
    };
  }

  // 2. Questions about one product
  if (items.length > 0) {
    const m = items[0];
    return {
      text: `${m.icon} ${m.name} · ${rupee(m.price)}\n${m.note}`,
      chips: [{ label: 'Add to order', send: `add ${plainName(m)}` }, { label: 'Today’s menu' }],
    };
  }

  if (/\b(my order|cart|basket|total|bill|checkout)\b/.test(t)) return orderSummary(cart);

  if (/\b(fresh|oven|batch|hot|next)\b/.test(t)) {
    return { text: nextBatch(), chips: [{ label: 'Today’s menu' }, { label: 'Opening hours' }] };
  }

  if (/\b(hour|hours|open|opening|close|closing|timing|timings)\b/.test(t)) {
    return { text: `${openStatus()}\n${HOURS}`, chips: [{ label: 'What’s fresh next?' }, { label: 'Pickup' }] };
  }

  if (/\b(custom|birthday|wedding|celebration|party)\b/.test(t)) {
    return { text: 'We make custom cakes for birthdays and celebrations. Please give us three days’ notice and call or email us with your idea.', chips: [{ label: 'Contact' }] };
  }

  const cat = /\bbread/.test(t) ? 'Bread' : /\bpastr/.test(t) ? 'Pastry' : /\bcake|\btart|\bloaves/.test(t) ? 'Cakes' : null;
  if (cat) {
    return { text: MENU.filter((m) => m.cat === cat).map(line).join('\n'), chips: CATEGORY_CHIPS };
  }

  if (/\b(cheap|cheapest|price|prices|cost|how much)\b/.test(t)) {
    const sorted = [...MENU].sort((a, b) => a.price - b.price);
    return {
      text: `Our most affordable treat is the ${sorted[0].name} at ${rupee(sorted[0].price)}.\n\n` + sorted.map(line).join('\n'),
      chips: [{ label: 'My order' }],
    };
  }

  if (/\b(menu|sell|offer|items|today|available|got)\b/.test(t)) {
    const groups = ['Bread', 'Pastry', 'Cakes']
      .map((c) => `${c}\n${MENU.filter((m) => m.cat === c).map(line).join('\n')}`)
      .join('\n\n');
    return { text: groups, chips: [{ label: 'What’s fresh next?' }, { label: 'My order' }] };
  }

  if (/\b(pickup|pick up|collect|deliver|delivery|how do i order|order ahead|advance)\b/.test(t)) {
    return {
      text: 'You can order ahead here and collect it fresh the next morning. Order by 6 pm. We offer pickup only for now.',
      chips: [{ label: 'Go to checkout', href: '#order' }, { label: 'Opening hours' }],
    };
  }

  if (/\b(address|where|location|contact|phone|call|email|reach)\b/.test(t)) {
    return { text: CONTACT, chips: [{ label: 'Opening hours' }] };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t)) {
    return { text: 'Hello! What can I get you today?', chips: CATEGORY_CHIPS };
  }
  if (/\b(thanks|thank you|thx)\b/.test(t)) return { text: 'You’re welcome! Enjoy your bake.' };
  if (/\b(bye|goodbye|see you)\b/.test(t)) return { text: 'See you soon! Fresh bread is waiting for you.' };

  return {
    fallback: true,
    text: 'I’m not sure about that one. I can help with the menu, opening hours, the next batch from the oven, or your order.',
    chips: [{ label: 'Today’s menu' }, { label: 'Opening hours' }, { label: 'What’s fresh next?' }, { label: 'My order' }],
  };
}
