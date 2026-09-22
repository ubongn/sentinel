export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <path d="M24 4L6 12v12c0 10 8 18.5 18 20 10-1.5 18-10 18-20V12L24 4z" fill="#7C3AED" stroke="#6D28D9" strokeWidth="1.5"/>
            <path d="M24 10L12 15v7c0 7 5.3 12.5 12 13.5 6.7-1 12-6.5 12-13.5v-7L24 10z" fill="#8B5CF6"/>
            <path d="M18 24l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
