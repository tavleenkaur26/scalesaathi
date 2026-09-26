import { Link, NavLink, Outlet } from "react-router-dom";
import Container from "../components/Container";
import scaleLogo from "../assets/hero/logo.png";
import "./PublicLayout.css";

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <Container className="public-header__inner">
          <Link to="/" className="public-header__wordmark" aria-label="ScaleSaathi home">
            <img className="public-header__mark" src={scaleLogo} alt="" />
            <span>Scale<em>Saathi</em></span>
          </Link>

          <nav className="public-header__nav" aria-label="Public navigation">
            <NavLink to="/login" className="public-header__link public-header__link--cta">
              Login/Register
            </NavLink>
          </nav>
        </Container>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <Container className="public-footer__inner">
          <span className="text-faint">ScaleSaathi — OIML R 76 test report automation</span>
        </Container>
      </footer>
    </div>
  );
}
