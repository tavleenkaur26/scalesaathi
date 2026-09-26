import "./SectionLabel.css";

/**
 * A small categorical marker — use it to name what a section IS
 * (a status, a test type, a role), not as decoration above every heading.
 */
export default function SectionLabel({ children, tone = "default", className = "" }) {
  return <span className={`section-label section-label--${tone} ${className}`}>{children}</span>;
}
