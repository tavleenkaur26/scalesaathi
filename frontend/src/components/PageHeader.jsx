import SectionLabel from "./SectionLabel";
import "./PageHeader.css";

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}
        <h1>{title}</h1>
        {description && <p className="text-soft">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
