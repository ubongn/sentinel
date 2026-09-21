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
            <rect width="28" height="28" rx="6" fill="#6C5CE7"/>
            <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Sentinel</span>
        </Link>
        <div className="navbar-links">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button className="connect-btn" id="connect-wallet-btn">
          Connect Wallet
        </button>
      </div>
    </nav>
  );
}
