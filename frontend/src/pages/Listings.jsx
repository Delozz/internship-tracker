import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getListings, getApplications, createApplication } from "../api/client.js";
import FilterBar from "../components/FilterBar.jsx";
import { isNew } from "../utils/recency.js";

const ROLE_BADGE = {
  swe: "bg-blue-500/20 text-blue-300",
  quant: "bg-purple-500/20 text-purple-300",
  cs_research: "bg-green-500/20 text-green-300",
  other: "bg-gray-500/20 text-gray-400",
};

const SOURCE_LABEL = { simplify: "Simplify", github: "GitHub", manual: "Manual" };

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

export default function Listings() {
  const [filters, setFilters] = useState({ search: "", role_type: "", source: "" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savedIds, setSavedIds] = useState(() => new Set());
  const LIMIT = 50;

  // Listing ids already in the tracker — used to prevent duplicate saves.
  useEffect(() => {
    getApplications()
      .then((apps) => setSavedIds(new Set(apps.map((a) => a.listing_id).filter(Boolean))))
      .catch(() => {}); // non-fatal — Save just won't show as already-saved
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getListings({ ...filters, limit: LIMIT, offset: page * LIMIT })
      .then(setData)
      .catch(() => toast.error("Failed to load listings"))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(listing) {
    setSaving((s) => ({ ...s, [listing.id]: true }));
    try {
      await createApplication({
        listing_id: listing.id,
        company: listing.company,
        role: listing.title,
        status: "saved",
        deadline: listing.deadline ?? undefined,
      });
      setSavedIds((prev) => new Set(prev).add(listing.id));
      toast.success(`Saved ${listing.company} to tracker`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving((s) => ({ ...s, [listing.id]: false }));
    }
  }

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Listings</h1>
        <span className="text-sm text-gray-500">{data.total.toLocaleString()} total</span>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="text-gray-500 py-12 text-center text-sm">Loading…</div>
      ) : data.data.length === 0 ? (
        <div className="text-gray-500 py-12 text-center text-sm">No listings found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((l) => {
                  const d = daysUntil(l.deadline);
                  const deadlineCls =
                    d == null ? "text-gray-500" : d < 0 ? "text-red-400" : d <= 7 ? "text-amber-400" : "text-gray-400";
                  return (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-900 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        <span className="inline-flex items-center gap-1.5">
                          {l.company}
                          {isNew(l.created_at) && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300">
                              New
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {l.url ? (
                          <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-indigo-400">
                            {l.title}
                          </a>
                        ) : (
                          l.title
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{l.location || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[l.role_type] ?? ROLE_BADGE.other}`}>
                          {l.role_type ?? "other"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{SOURCE_LABEL[l.source] ?? l.source}</td>
                      <td className={`px-4 py-3 ${deadlineCls}`}>{l.deadline ?? "—"}</td>
                      <td className="px-4 py-3">
                        {savedIds.has(l.id) ? (
                          <span className="text-xs px-3 py-1 text-green-400">✓ Saved</span>
                        ) : (
                          <button
                            onClick={() => handleSave(l)}
                            disabled={saving[l.id]}
                            className="text-xs px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
                          >
                            {saving[l.id] ? "Saving…" : "Save"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs rounded-md bg-gray-800 text-gray-300 disabled:opacity-30 hover:bg-gray-700"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500 self-center">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs rounded-md bg-gray-800 text-gray-300 disabled:opacity-30 hover:bg-gray-700"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
