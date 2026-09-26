import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/hero/logo.png";
import "./AppLayout.css";

const NAV_ITEMS = [
  { to: "/app", label: "Overview", icon: "overview", end: true },
  { to: "/app/instruments", label: "Instruments", icon: "instrument" },
  { to: "/app/sessions", label: "Test Sessions", icon: "sessions" },
  { to: "/app/review", label: "Review Queue", icon: "review", roles: ["Reviewer", "Admin"] },
  { to: "/app/reports", label: "Reports", icon: "reports" },
  { to: "/app/repository", label: "Repository", icon: "repository" },
  { to: "/app/history", label: "History", icon: "history" },
  { to: "/app/rulesets", label: "Rulesets", icon: "rules", roles: ["Admin"] },
  { to: "/app/settings", label: "Settings", icon: "settings" },
];

const glyphs = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  instrument: <><path d="M4 5h16v14H4zM8 19v2m8-2v2M8 9h8m-8 4h5"/><path d="M2 21h20"/></>,
  sessions: <><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M4 9h16m-11 4h2m3 0h2m-7 4h2"/></>,
  review: <><path d="M4 12l5 5L20 6"/><circle cx="12" cy="12" r="9"/></>,
  reports: <><path d="M6 3h9l4 4v14H6zM15 3v5h4M9 12h7m-7 4h7"/></>,
  repository: <><path d="M3 7h18v14H3zM6 4h12v3M7 11h10m-10 4h10"/></>,
  history: <><path d="M4 8V3m0 5h5"/><path d="M4.8 8a8.5 8.5 0 1 1-1 7M12 7v5l3 2"/></>,
  rules: <><path d="M5 3h14v18H5zM8 7h8m-8 4h8m-8 4h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 2.8-.2-.1a1.7 1.7 0 0 0-1.8.1 1.7 1.7 0 0 0-.9 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.1l-.2.1-1.6-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-.9h-.2v-3.2h.2a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.1-1.8l-.1-.2 2.8-1.6.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 .9-1.5v-.2h3.2v.2a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.8-.1l.2-.1 1.6 2.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5.9h.2v3.2h-.2a1.7 1.7 0 0 0-1.6 1.1z"/></>,
};

function Icon({ name }) {
  return <svg className="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyphs[name]}</svg>;
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const allowedItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const logout = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  return <div className="app-layout">
    {menuOpen && <button className="app-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`app-sidebar ${menuOpen ? "app-sidebar--open" : ""}`} aria-label="Application navigation">
      <Link className="app-sidebar__brand" to="/app"><img src={logo} alt=""/><span>ScaleSaathi<small>Measure. Verify. Trust.</small></span></Link>
      <p className="app-sidebar__section-label">WORKSPACE</p>
      <nav className="app-sidebar__nav" aria-label="Main navigation">
        <ul>{allowedItems.map((item) => <li key={item.label}>
          <NavLink to={item.to} end={item.end} className={({ isActive }) => `app-sidebar__link ${isActive ? "app-sidebar__link--active" : ""}`}><Icon name={item.icon}/><span>{item.label}</span></NavLink>
        </li>)}</ul>
      </nav>
      <div className="app-sidebar__footer"><span className="app-sidebar__avatar" aria-hidden="true">{user?.full_name?.trim()?.[0]?.toUpperCase() || "S"}</span><span className="app-sidebar__identity"><strong>{user?.full_name || "ScaleSaathi user"}</strong><small>{user?.role}</small></span><button className="app-sidebar__logout" type="button" onClick={logout}>Log out</button></div>
    </aside>

    <div className="app-body">
      <header className="app-topbar">
        <button className="app-menu-toggle" type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
        <Link className="app-topbar__crumb" to="/app">ScaleSaathi</Link>
        <div className="app-topbar__user"><span className="app-sidebar__avatar" aria-hidden="true">{user?.full_name?.trim()?.[0]?.toUpperCase() || "S"}</span><span><strong>{user?.full_name || "ScaleSaathi user"}</strong><small>{user?.role}</small></span><button type="button" onClick={logout}>Log out</button></div>
      </header>
      <main className="app-main"><Outlet /></main>
    </div>
  </div>;
}
