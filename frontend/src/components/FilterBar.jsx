export default function FilterBar({ filters, onChange }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Search company or role…"
        value={filters.search || ""}
        onChange={(e) => set("search", e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
      />

      <select
        value={filters.role_type || ""}
        onChange={(e) => set("role_type", e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">All types</option>
        <option value="swe">SWE</option>
        <option value="quant">Quant</option>
        <option value="cs_research">CS Research</option>
        <option value="other">Other</option>
      </select>

      <select
        value={filters.source || ""}
        onChange={(e) => set("source", e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">All sources</option>
        <option value="simplify">Simplify</option>
        <option value="github">GitHub</option>
        <option value="manual">Manual</option>
      </select>

      {(filters.search || filters.role_type || filters.source) && (
        <button
          onClick={() => onChange({ search: "", role_type: "", source: "" })}
          className="text-xs text-gray-500 hover:text-gray-300 px-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
