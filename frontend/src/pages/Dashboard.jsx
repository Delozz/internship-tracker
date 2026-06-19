import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getStats } from "../api/client.js";
import StatsPanel from "../components/StatsPanel.jsx";

const STATUS_LABELS = {
  saved: "Saved",
  applied: "Applied",
  oa_received: "OA Recv.",
  oa_submitted: "OA Sub.",
  interview_scheduled: "Int. Sched.",
  interview_done: "Int. Done",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const BAR_COLORS = {
  saved: "#6366f1",
  applied: "#3b82f6",
  oa_received: "#f59e0b",
  oa_submitted: "#f97316",
  interview_scheduled: "#8b5cf6",
  interview_done: "#a78bfa",
  offer: "#22c55e",
  rejected: "#ef4444",
  withdrawn: "#6b7280",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-semibold">{payload[0].payload.label}</p>
      <p className="text-gray-300">{payload[0].value} application{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 py-12 text-center text-sm">Loading…</div>;
  if (!stats) return <div className="text-gray-500 py-12 text-center text-sm">No data available.</div>;

  const chartData = Object.entries(stats.applications_by_status).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Dashboard</h1>

      <StatsPanel stats={stats} />

      {/* Bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Applications by status
        </h2>
        {chartData.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No applications yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={BAR_COLORS[entry.status] ?? "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Upcoming deadlines (14 days)
        </h2>
        {stats.upcoming_deadlines.length === 0 ? (
          <p className="text-gray-600 text-sm">No upcoming deadlines.</p>
        ) : (
          <ul className="space-y-2">
            {stats.upcoming_deadlines.map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">
                  {item.company}{" "}
                  <span className="text-gray-400 font-normal">— {item.role}</span>
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.days_remaining <= 1
                      ? "bg-red-500/20 text-red-400"
                      : item.days_remaining <= 7
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {item.days_remaining === 0
                    ? "Today"
                    : item.days_remaining === 1
                      ? "Tomorrow"
                      : `${item.days_remaining}d`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
