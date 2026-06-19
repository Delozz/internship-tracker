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

const COLUMN_ORDER = JSON.parse(localStorage.getItem("kanban_col_order") ?? "null") ?? STATUSES.map((s) => s.key);

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
    const targetStatus = STATUSES.find((s) => s.key === over.id)?.key ?? over.id;
    if (!targetStatus) return;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Tracker</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          + Add manually
        </button>
      </div>

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
