import { Routes, Route, NavLink } from "react-router-dom";
import Listings from "./pages/Listings.jsx";
import Tracker from "./pages/Tracker.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DeadlineBanner from "./components/DeadlineBanner.jsx";

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-600 text-white"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2">
          <span className="text-white font-semibold mr-6 text-sm tracking-wide">
            Internship Tracker
          </span>
          <NavItem to="/" label="Listings" />
          <NavItem to="/tracker" label="Tracker" />
          <NavItem to="/dashboard" label="Dashboard" />
        </div>
      </nav>

      <DeadlineBanner />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Listings />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
