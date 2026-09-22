import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { ConnectButton } from "./ConnectButton";

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/create-policy", label: "Create Policy" },
  { path: "/agents", label: "Agents" },
  { path: "/activity", label: "Activity" },
  { path: "/docs", label: "Docs" },
];

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <path d="M24 4L6 12v12c0 10 8 18.5 18 20 10-1.5 18-10 18-20V12L24 4z" fill="#7C3AED" stroke="#6D28D9" strokeWidth="1.5"/>
            <path d="M24 10L12 15v7c0 7 5.3 12.5 12 13.5 6.7-1 12-6.5 12-13.5v-7L24 10z" fill="#8B5CF6"/>
            <path d="M18 24l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Sentinel</span>
        </Link>

        <div className="navbar-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ConnectButton />
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="mobile-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${location.pathname === item.path ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
