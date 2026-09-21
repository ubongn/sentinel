import { Link, useLocation } from "react-router-dom";

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

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#7C3AED" />
            <path
              d="M14 6L14 8M14 20L14 22M6 14L8 14M20 14L22 14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="14" cy="14" r="5" stroke="white" strokeWidth="2" fill="none" />
            <path d="M14 9v3l2.5 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className="connect-btn" id="connect-wallet-btn">
            Connect Wallet
          </button>
        </div>
      </div>
    </nav>
  );
}
