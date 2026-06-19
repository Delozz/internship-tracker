import { useEffect, useState } from "react";
import { getApplications } from "../api/client.js";

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

export default function DeadlineBanner() {
  const [urgent, setUrgent] = useState([]);

  useEffect(() => {
    getApplications()
      .then((apps) => {
        const soon = apps.filter((a) => {
          if (!a.deadline) return false;
          if (["rejected", "withdrawn", "offer"].includes(a.status)) return false;
          return daysUntil(a.deadline) <= 3;
        });
        setUrgent(soon);

        // Browser notification for deadlines within 24h
        if (soon.some((a) => daysUntil(a.deadline) <= 1) && "Notification" in window) {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              soon
                .filter((a) => daysUntil(a.deadline) <= 1)
                .forEach((a) =>
                  new Notification(`Deadline today: ${a.company}`, {
                    body: a.role,
                  }),
                );
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!urgent.length) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-sm flex gap-4 flex-wrap">
      <span className="font-semibold">⚠ Upcoming deadlines:</span>
      {urgent.map((a) => {
        const d = daysUntil(a.deadline);
        return (
          <span key={a.id}>
            {a.company} — {a.role}{" "}
            <span className={d <= 1 ? "text-red-400 font-bold" : ""}>
              ({d <= 0 ? "today!" : d === 1 ? "tomorrow" : `${d} days`})
            </span>
          </span>
        );
      })}
    </div>
  );
}
