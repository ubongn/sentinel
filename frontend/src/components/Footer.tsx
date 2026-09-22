export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
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
        </div>
        <p className="footer-text">On-chain guardrails for AI agents on Monad</p>
        <div className="footer-links">
          <a href="https://github.com/ubongn/sentinel" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://monad-testnet.socialscan.io" target="_blank" rel="noopener noreferrer">Explorer</a>
        </div>
      </div>
    </footer>
  );
}
