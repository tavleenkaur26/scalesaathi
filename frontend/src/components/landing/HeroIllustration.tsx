import "./HeroIllustration.css";

/**
 * The primary hero visual: an analytical balance under a draft shield,
 * a set of graduated calibration weights, soft geometric colour fields,
 * thin botanical linework, and corner crop-marks that echo a measurement
 * viewport. Everything below is inline SVG / CSS — no bitmap assets.
 */
export function BalanceIllustration() {
  return (
    <svg
      className="balance-illustration"
      viewBox="0 0 640 700"
      role="img"
      aria-label="An analytical balance under a glass draft shield, beside a set of graduated calibration weights, with botanical linework"
    >
      {/* soft geometric fields — allowed to sit close to / past the edges */}
      <g className="balance-illustration__field balance-illustration__field--a">
        <circle cx="452" cy="196" r="192" fill="var(--peach)" opacity="0.6" />
      </g>
      <g className="balance-illustration__field balance-illustration__field--b">
        <circle cx="150" cy="520" r="168" fill="var(--eucalyptus)" opacity="0.48" />
      </g>
      <g className="balance-illustration__field balance-illustration__field--c">
        <circle cx="60" cy="120" r="70" fill="var(--pistachio)" opacity="0.55" />
      </g>

      {/* corner crop-marks — a quiet precision / viewport motif */}
      <g className="balance-illustration__crops" stroke="var(--ink)" strokeWidth="1.1" opacity="0.4">
        <path d="M18,64 V18 H64" fill="none" />
        <path d="M576,636 V682 H530" fill="none" />
      </g>

      {/* botanical linework, behind the instrument — reaches toward the left edge */}
      <g
        className="balance-illustration__botanical balance-illustration__botanical--back"
        fill="none"
        stroke="var(--ink-faint)"
        strokeWidth="1.3"
        strokeLinecap="round"
      >
        <path d="M-10,650 C60,610 70,540 130,500 C175,468 188,412 164,356" />
        <path d="M16,618 C46,594 76,580 64,548" />
        <path d="M46,566 C76,554 90,534 80,512" />
        <path d="M96,486 C120,472 132,452 124,430" />
        <path d="M148,368 C170,352 178,330 166,308" />
      </g>

      {/* small crosshair / measurement marks */}
      <g className="balance-illustration__crosshairs" stroke="var(--ink-soft)" strokeWidth="1.1" opacity="0.5">
        <g transform="translate(524,120)">
          <line x1="-9" y1="0" x2="9" y2="0" />
          <line x1="0" y1="-9" x2="0" y2="9" />
        </g>
        <g transform="translate(96,232)">
          <line x1="-7" y1="0" x2="7" y2="0" />
          <line x1="0" y1="-7" x2="0" y2="7" />
        </g>
      </g>

      {/* graduated calibration weights, foreground-right */}
      <g className="balance-illustration__weights">
        <ellipse cx="487" cy="616" rx="34" ry="8" fill="var(--ink)" opacity="0.08" />
        <rect x="454" y="536" width="64" height="82" rx="10" fill="var(--clay)" />
        <rect x="454" y="536" width="64" height="15" rx="7" fill="var(--clay-deep)" />
        <rect x="475" y="520" width="22" height="18" rx="4" fill="var(--clay-deep)" />

        <rect x="514" y="566" width="46" height="52" rx="8" fill="var(--eucalyptus)" />
        <rect x="514" y="566" width="46" height="11" rx="5" fill="#a9b189" />

        <rect x="390" y="578" width="38" height="40" rx="7" fill="var(--clay-deep)" />
        <text x="409" y="602" textAnchor="middle" className="balance-illustration__weight-label">
          500g
        </text>
      </g>

      {/* the balance itself */}
      <g className="balance-illustration__instrument">
        {/* base / control unit */}
        <rect x="128" y="472" width="290" height="100" rx="17" fill="var(--clay)" />
        <rect x="128" y="472" width="290" height="100" rx="17" fill="var(--ink)" opacity="0.04" />
        <rect x="156" y="496" width="154" height="50" rx="7" fill="#20241d" />
        <text x="233" y="528" textAnchor="middle" className="balance-illustration__display">
          0.000&nbsp;g
        </text>
        <circle cx="342" cy="510" r="7.5" fill="var(--ivory)" opacity="0.85" />
        <circle cx="342" cy="534" r="7.5" fill="var(--ivory)" opacity="0.85" />
        <circle cx="368" cy="522" r="9.5" fill="var(--clay-deep)" />

        {/* pillar */}
        <rect x="258" y="444" width="26" height="32" fill="var(--ink-faint)" />

        {/* weighing pan */}
        <ellipse cx="271" cy="446" rx="82" ry="16" fill="var(--surface-raised)" stroke="var(--ink)" strokeWidth="1.4" />
        <ellipse cx="271" cy="442" rx="65" ry="11" fill="var(--pistachio)" opacity="0.8" />

        {/* draft shield */}
        <path
          d="M170,446 L170,232 L214,190 L370,190 L414,232 L414,446"
          fill="var(--pistachio)"
          opacity="0.32"
          stroke="var(--ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M214,190 L370,190 L414,232 L170,232 Z"
          fill="var(--surface-raised)"
          stroke="var(--ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <rect x="248" y="170" width="72" height="18" rx="5" fill="var(--clay)" stroke="var(--ink)" strokeWidth="1" />
        <line x1="292" y1="232" x2="292" y2="446" stroke="var(--ink)" strokeWidth="1" opacity="0.35" />
        <line x1="170" y1="232" x2="414" y2="232" stroke="var(--ink)" strokeWidth="1" opacity="0.35" />
      </g>

      {/* botanical linework, in front, overlapping the base */}
      <g
        className="balance-illustration__botanical balance-illustration__botanical--front"
        fill="none"
        stroke="var(--eucalyptus)"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M100,606 C136,584 158,598 186,578" />
        <path d="M124,592 C134,578 136,562 128,552" />
        <path d="M158,582 C168,568 170,554 162,544" />
      </g>
    </svg>
  );
}

/**
 * A compact secondary scale used as a small motif in the bottom strip —
 * echoes the main illustration at a much smaller scale.
 */
export function CornerScale() {
  return (
    <svg
      className="corner-scale"
      viewBox="0 0 160 110"
      role="img"
      aria-label="A small digital bench scale"
    >
      <rect x="14" y="46" width="132" height="50" rx="10" fill="var(--clay)" />
      <rect x="34" y="60" width="70" height="24" rx="5" fill="#20241d" />
      <text x="69" y="77" textAnchor="middle" className="corner-scale__display">
        0.00&nbsp;g
      </text>
      <circle cx="122" cy="72" r="5" fill="var(--ivory)" opacity="0.85" />
      <rect x="30" y="24" width="100" height="24" rx="6" fill="var(--surface-raised)" stroke="var(--ink)" strokeWidth="1.2" />
    </svg>
  );
}

/** A quiet rotated editorial caption set beside the illustration. */
export function PrecisionCaption() {
  return (
    <p className="precision-caption" aria-hidden="true">
      Precision&nbsp;Builds&nbsp;Trust
    </p>
  );
}
