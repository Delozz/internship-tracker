const BASE = "/api";
const API_KEY = import.meta.env.VITE_API_KEY;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Listings
export const getListings = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== "")),
  ).toString();
  return request(`/listings${qs ? `?${qs}` : ""}`);
};
export const patchListing = (id, body) =>
  request(`/listings/${id}`, { method: "PATCH", body });

// Applications
export const getApplications = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== "")),
  ).toString();
  return request(`/applications${qs ? `?${qs}` : ""}`);
};
export const createApplication = (body) =>
  request("/applications", { method: "POST", body });
export const patchApplication = (id, body) =>
  request(`/applications/${id}`, { method: "PATCH", body });
export const deleteApplication = (id) =>
  request(`/applications/${id}`, { method: "DELETE" });

// Stats
export const getStats = () => request("/stats");
