import "./Navbar.css";

function ScaleMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="20" y1="6" x2="20" y2="14" stroke="currentColor" strokeWidth="1.6" />
      <line x1="7" y1="10" x2="33" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M7 10 L2.5 19 A6 5 0 0 0 11.5 19 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M33 10 L28.5 19 A6 5 0 0 0 37.5 19 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <line x1="20" y1="14" x2="20" y2="17.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 32 h20 l-3 -6 h-14 z" fill="currentColor" opacity="0.9" />
      <rect x="17.5" y="17" width="5" height="4" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a className="navbar__brand" href="#top" aria-label="ScaleSaathi home">
          <ScaleMark />
          <span className="navbar__brand-text">
            <span className="navbar__wordmark">
              Scale<em>Saathi</em>
            </span>
            <span className="navbar__tagline">Measure. Verify. Trust.</span>
          </span>
        </a>

        <a className="navbar__auth" href="#login">
          Login&nbsp;/&nbsp;Register
        </a>
      </div>
    </header>
  );
}
