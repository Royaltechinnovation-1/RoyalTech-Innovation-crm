import { useEffect, useState } from "react";
import { formatLiveClock } from "../lib/locationTrack";

export function LiveClock() {
  const [now, setNow] = useState(() => formatLiveClock());

  useEffect(() => {
    const tick = () => setNow(formatLiveClock());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="topbar-live-clock" title="Live time (IST)">
      <strong>{now.time}</strong>
      <span>{now.date}</span>
    </div>
  );
}
