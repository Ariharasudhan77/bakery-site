import { OVEN } from '../data/menu';

export default function OvenBoard() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const nextIdx = OVEN.findIndex(o => o.h > hour);
  return (
    <div className="board">
      <h2>Out of the oven today</h2>
      <small>{nextIdx === -1 ? "Everything is baked. See you at 6:30 tomorrow." : "Next batch is highlighted."}</small>
      <ul>
        {OVEN.map((o, i) => (
          <li key={o.label} className={nextIdx === -1 || i < nextIdx ? "done" : i === nextIdx ? "next" : ""}>
            <time>{o.label}</time><span>{o.item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
