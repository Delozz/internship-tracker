export default function StatsPanel({ stats }) {
  const cards = [
    { label: "Total listings", value: stats.total_listings ?? "—" },
    { label: "New today", value: stats.new_listings_today ?? "—" },
    {
      label: "Active applications",
      value: Object.values(stats.applications_by_status ?? {}).reduce((a, b) => a + b, 0) || "—",
    },
    {
      label: "Response rate",
      value:
        stats.response_rate != null
          ? `${(stats.response_rate * 100).toFixed(0)}%`
          : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{c.label}</p>
          <p className="text-2xl font-bold text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
