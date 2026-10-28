import { Type } from '@google/genai';
import { collection } from './store.js';
import { MENU, OVEN, STORE } from '../src/data/menu.js';

const orders = collection('orders');
const MAX_QTY = 20;
const rupee = (n) => '₹' + n;

// ---- cart helpers (the cart lives in the browser; the server re-validates it on every request) ----
export function cleanCart(raw) {
  const cart = {};
  if (raw && typeof raw === 'object') {
    for (const [id, qty] of Object.entries(raw)) {
      const item = MENU.find((m) => String(m.id) === String(id));
      const q = Math.floor(Number(qty));
      if (item && q >= 1) cart[item.id] = Math.min(q, MAX_QTY);
    }
  }
  return cart;
}

export function summarize(cart) {
  const lines = MENU.filter((m) => cart[m.id]).map((m) => ({
    name: m.name, quantity: cart[m.id], unitPrice: m.price, subtotal: m.price * cart[m.id],
  }));
  return { lines, total: lines.reduce((s, l) => s + l.subtotal, 0), isEmpty: lines.length === 0 };
}

export function summaryText(cart) {
  const s = summarize(cart);
  return s.isEmpty ? 'empty' : s.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ') + ` (total ${rupee(s.total)})`;
}

// ---- match what the customer said ("croissant", "2 milk buns") to a menu item ----
const words = (s) => (String(s).toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 3).map((w) => w.replace(/s$/, ''));

function findItem(name) {
  const q = words(name);
  const scored = MENU.map((m) => ({ m, score: q.filter((w) => words(m.name).includes(w)).length })).filter((x) => x.score > 0);
  if (scored.length === 0) return {};
  const best = Math.max(...scored.map((x) => x.score));
  const top = scored.filter((x) => x.score === best);
  return top.length === 1 ? { item: top[0].m } : { ambiguous: top.map((x) => x.m.name) };
}

function changeItems(cart, items, mode) {
  const changed = [], problems = [];
  for (const it of Array.isArray(items) ? items : []) {
    const r = findItem(it?.name);
    if (r.ambiguous) { problems.push({ asked: it?.name, issue: 'ambiguous, ask which one', options: r.ambiguous }); continue; }
    if (!r.item) { problems.push({ asked: it?.name, issue: 'not on our menu' }); continue; }
    const id = r.item.id;
    if (mode === 'add') {
      const qty = Math.min(Math.max(Math.floor(Number(it.quantity)) || 1, 1), MAX_QTY);
      cart[id] = Math.min((cart[id] || 0) + qty, MAX_QTY);
    } else if (it.quantity == null) {
      delete cart[id];
    } else {
      const left = (cart[id] || 0) - Math.max(Math.floor(Number(it.quantity)) || 1, 1);
      if (left > 0) cart[id] = left; else delete cart[id];
    }
    changed.push({ item: r.item.name, nowInOrder: cart[id] || 0 });
  }
  return { changed, problems, order: summarize(cart) };
}

// ---- opening status ----
function storeStatus({ day, hour }) {
  const closedToday = day === STORE.closedDay;
  const upcoming = OVEN.filter((o) => o.h > hour);
  return {
    openNow: !closedToday && hour >= STORE.openHour && hour < STORE.closeHour,
    closedToday,
    hours: 'Tuesday to Sunday, 6:30 am to 8:00 pm. Closed on Mondays.',
    nextBatchOutOfOven: closedToday ? 'Closed today' : upcoming[0] ? `${upcoming[0].item} at ${upcoming[0].label}` : `Nothing more today. Tomorrow starts with ${OVEN[0].item} at ${OVEN[0].label}`,
    laterToday: closedToday ? [] : upcoming.slice(1).map((o) => `${o.item} at ${o.label}`),
    orderCutoff: '6 pm for pickup the next morning',
    orderCutoffPassed: hour >= STORE.orderCutoff,
  };
}

// ---- saving a finished order (used by the chatbot AND the website order form) ----
// Name and phone default to the ones saved on the signed-in customer's account.
export function saveOrder({ user, name, phone, cart }) {
  const n = String(name || user.name || '').trim();
  const p = String(phone || user.phone || '').trim();
  if (n.length < 2 || n.length > 60) return { ok: false, error: 'Please give a valid name.' };
  if (!/^\+?[\d\s-]{7,16}$/.test(p)) return { ok: false, error: 'Please give a valid phone number.' };
  const summary = summarize(cart);
  if (summary.isEmpty) return { ok: false, error: 'The order is empty.' };

  let orderId;
  do { orderId = 'PR-' + Math.floor(1000 + Math.random() * 9000); } while (orders.find((o) => o.orderId === orderId));
  orders.insert({ orderId, userId: user.id, createdAt: new Date().toISOString(), name: n, phone: p, ...summary });
  return { ok: true, orderId, total: summary.total, pickup: 'Tomorrow morning from 6:30 am. We will text you when it is ready.' };
}

// The signed-in customer's own past orders, newest first
export function ordersFor(userId) {
  return orders.filter((o) => o.userId === userId).slice(-20).reverse()
    .map((o) => ({ orderId: o.orderId, createdAt: o.createdAt, lines: o.lines, total: o.total }));
}

// ---- tool list the AI can call ----
const itemList = (desc, withQty) => ({
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description: desc,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Menu item name as the customer said it, e.g. "croissant"' },
          quantity: { type: Type.INTEGER, description: withQty },
        },
        required: ['name'],
      },
    },
  },
  required: ['items'],
});

export const declarations = [
  { name: 'add_to_order', description: 'Add menu items to the customer’s order. Call this as soon as the customer says they want something.', parameters: itemList('Items to add', 'How many. Defaults to 1.') },
  { name: 'remove_from_order', description: 'Remove items from the customer’s order.', parameters: itemList('Items to remove', 'How many to remove. Leave out to remove the item completely.') },
  { name: 'view_order', description: 'Get the current order with quantities and the total price.' },
  { name: 'clear_order', description: 'Empty the whole order.' },
  {
    name: 'place_order',
    description: 'Place the order for pickup. Only call after the customer has confirmed the order. The signed-in customer’s saved name and phone are used automatically, so leave them out unless the customer wants different pickup details.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING, description: 'Only if different from the saved name' },
        phone: { type: Type.STRING, description: 'Only if different from the saved phone' },
      },
    },
  },
  { name: 'get_store_status', description: 'Check whether the bakery is open right now, opening hours, the next batch out of the oven, and the order cut-off time.' },
];

// ctx = { cart, now, changed }. The cart object is edited in place.
export function runTool(name, args, ctx) {
  switch (name) {
    case 'add_to_order': { const r = changeItems(ctx.cart, args.items, 'add'); ctx.changed = true; return r; }
    case 'remove_from_order': { const r = changeItems(ctx.cart, args.items, 'remove'); ctx.changed = true; return r; }
    case 'view_order': return { order: summarize(ctx.cart) };
    case 'clear_order': { for (const k of Object.keys(ctx.cart)) delete ctx.cart[k]; ctx.changed = true; return { order: summarize(ctx.cart) }; }
    case 'place_order': {
      const r = saveOrder({ user: ctx.user, name: args.customer_name, phone: args.phone, cart: ctx.cart });
      if (r.ok) { for (const k of Object.keys(ctx.cart)) delete ctx.cart[k]; ctx.changed = true; }
      return r;
    }
    case 'get_store_status': return storeStatus(ctx.now);
    default: return { error: 'Unknown tool' };
  }
}
