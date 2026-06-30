import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isNew, formatShortDate } from "../utils/recency.js";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

export default function KanbanCard({ app, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const d = daysUntil(app.deadline);
  const deadlineColor =
    d == null
      ? ""
      : d < 0
        ? "text-red-400"
        : d <= 7
          ? "text-amber-400"
          : "text-gray-400";

  const recent = isNew(app.created_at);
  const added = formatShortDate(app.created_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(app)}
      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-colors select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="text-sm font-semibold text-white leading-tight">{app.company}</p>
        {recent && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300">
            New
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2 leading-tight">{app.role}</p>
      {app.deadline && (
        <p className={`text-xs ${deadlineColor}`}>
          {d != null && d < 0
            ? "Past deadline"
            : d === 0
              ? "Due today"
              : d === 1
                ? "Due tomorrow"
                : `Due ${app.deadline}`}
        </p>
      )}
      {app.notes && (
        <p className="text-xs text-gray-500 mt-1.5 truncate">{app.notes}</p>
      )}
      {added && (
        <p className="text-[11px] text-gray-600 mt-1.5">Added {added}</p>
      )}
    </div>
  );
}
