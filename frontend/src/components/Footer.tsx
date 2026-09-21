export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#6C5CE7"/>
            <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
