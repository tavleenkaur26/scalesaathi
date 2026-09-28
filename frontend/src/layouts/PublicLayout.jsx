import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Container from "../components/Container";
import scaleLogo from "../assets/hero/logo.png";
import "./PublicLayout.css";

const navLinks = [
  ["Home", "/#top"],
  ["Product Story", "/#product-story"],
  ["Features", "/#features"],
  ["Rounding Trap", "/#rounding-trap"],
];

export default function PublicLayout() {
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  /* hash links (/#features) need an explicit scroll under client-side routing */
  useEffect(() => {
    if (pathname !== "/") return;
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const id = hash.slice(1);
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="public-layout">
      <header className={`public-header ${scrolled ? "is-scrolled" : ""}`}>
        <Container className="public-header__inner">
          <Link to="/" className="public-header__wordmark" aria-label="ScaleSaathi home">
            <img className="public-header__mark" src={scaleLogo} alt="" />
            <span>Scale<em>Saathi</em></span>
          </Link>

          <nav className="public-header__nav" aria-label="Public navigation">
            <ul className="public-header__links">
              {navLinks.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="public-header__link">{label}</Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="public-header__btn public-header__btn--ghost">Login</Link>
            <Link to="/register" className="public-header__btn public-header__btn--solid">Get Started</Link>
          </nav>
        </Container>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <Container className="public-footer__inner">
          <span className="public-footer__brand">
            <img src={scaleLogo} alt="" />
            Scale<em>Saathi</em>
          </span>
          <span className="public-footer__note">OIML R 76 test report automation</span>
        </Container>
      </footer>
    </div>
  );
}
