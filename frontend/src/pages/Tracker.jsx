import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { getApplications, createApplication, patchApplication, deleteApplication } from "../api/client.js";
import KanbanCard from "../components/KanbanCard.jsx";

const STATUSES = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "oa_received", label: "OA Received" },
  { key: "oa_submitted", label: "OA Submitted" },
  { key: "interview_scheduled", label: "Interview Sched." },
  { key: "interview_done", label: "Interview Done" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DroppableColumn({ status, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-[120px] rounded-lg p-2 transition-colors ${isOver ? "bg-indigo-500/10" : ""}`}
    >
      {children}
    </div>
  );
}

function DrawerField({ label, value, onChange, type = "text", textarea = false }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      )}
    </div>
  );
}

export default function Tracker() {
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", role: "", status: "saved" });
  const [view, setView] = useState("board");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(() => {
    getApplications().then(setApps).catch(() => toast.error("Failed to load applications"));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openDrawer(app) {
    setSelected(app);
    setDraft({ ...app });
  }

  function closeDrawer() {
    setSelected(null);
    setDraft(null);
  }

  async function saveDrawer() {
    try {
      const { id, created_at, updated_at, ...patch } = draft;
      await patchApplication(id, patch);
      toast.success("Updated");
      load();
      closeDrawer();
    } catch {
      toast.error("Update failed");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this application?")) return;
    try {
      await deleteApplication(id);
      toast.success("Deleted");
      load();
      closeDrawer();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // `over.id` is a status key when dropped on empty column space, but a card's
    // id when dropped onto another card — resolve the latter back to its column.
    const overApp = apps.find((a) => a.id === over.id);
    const targetStatus = STATUSES.find((s) => s.key === over.id)?.key ?? overApp?.status;
    if (!targetStatus) return;
    const current = apps.find((a) => a.id === active.id);
    if (current?.status === targetStatus) return;
    try {
      await patchApplication(active.id, { status: targetStatus });
      setApps((prev) => prev.map((a) => (a.id === active.id ? { ...a, status: targetStatus } : a)));
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleAddManual() {
    if (!newApp.company || !newApp.role) { toast.error("Company and role are required"); return; }
    try {
      await createApplication(newApp);
      toast.success("Added");
      setShowAdd(false);
      setNewApp({ company: "", role: "", status: "saved" });
      load();
    } catch {
      toast.error("Failed to add");
    }
  }

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s.key, []]));
  apps.forEach((a) => { if (byStatus[a.status]) byStatus[a.status].push(a); });
  const sortedByNewest = [...apps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Tracker</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-700 overflow-hidden text-xs">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 transition-colors ${view === "board" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 transition-colors ${view === "list" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            + Add manually
          </button>
        </div>
      </div>

      {view === "board" ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <div key={s.key} className="flex-shrink-0 w-52">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</span>
                <span className="text-xs text-gray-600">{byStatus[s.key].length}</span>
              </div>
              <SortableContext items={byStatus[s.key].map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn status={s.key}>
                  {byStatus[s.key].map((app) => (
                    <KanbanCard key={app.id} app={app} onClick={openDrawer} />
                  ))}
                </DroppableColumn>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
      ) : sortedByNewest.length === 0 ? (
        <div className="text-gray-500 py-12 text-center text-sm">No applications yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {sortedByNewest.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => openDrawer(app)}
                  className="border-b border-gray-800/50 hover:bg-gray-900 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{app.company}</td>
                  <td className="px-4 py-3 text-gray-300">{app.role}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {STATUS_LABEL[app.status] ?? app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{app.deadline ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(app.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && draft && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={closeDrawer}>
          <div
            className="w-full max-w-md bg-gray-900 border-l border-gray-800 h-full overflow-y-auto p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit Application</h2>
              <button onClick={closeDrawer} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <DrawerField label="Company" value={draft.company} onChange={(v) => setDraft((d) => ({ ...d, company: v }))} />
            <DrawerField label="Role" value={draft.role} onChange={(v) => setDraft((d) => ({ ...d, role: v }))} />

            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            <DrawerField label="Applied date" value={draft.applied_at} onChange={(v) => setDraft((d) => ({ ...d, applied_at: v }))} type="date" />
            <DrawerField label="Deadline" value={draft.deadline} onChange={(v) => setDraft((d) => ({ ...d, deadline: v }))} type="date" />
            <DrawerField label="OA date" value={draft.oa_date} onChange={(v) => setDraft((d) => ({ ...d, oa_date: v }))} type="date" />
            <DrawerField label="Interview date" value={draft.interview_date} onChange={(v) => setDraft((d) => ({ ...d, interview_date: v }))} type="date" />
            <DrawerField label="Offer deadline" value={draft.offer_deadline} onChange={(v) => setDraft((d) => ({ ...d, offer_deadline: v }))} type="date" />
            <DrawerField label="Notes" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} textarea />

            <div className="flex gap-2 mt-auto pt-4">
              <button onClick={saveDrawer} className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                Save changes
              </button>
              <button onClick={() => handleDelete(selected.id)} className="py-2 px-4 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-400 text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add manually modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white">Add application</h2>
            <DrawerField label="Company *" value={newApp.company} onChange={(v) => setNewApp((n) => ({ ...n, company: v }))} />
            <DrawerField label="Role *" value={newApp.role} onChange={(v) => setNewApp((n) => ({ ...n, role: v }))} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={newApp.status}
                onChange={(e) => setNewApp((n) => ({ ...n, status: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none"
              >
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddManual} className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">Add</button>
              <button onClick={() => setShowAdd(false)} className="py-2 px-4 rounded-md bg-gray-800 text-gray-400 text-sm hover:bg-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
