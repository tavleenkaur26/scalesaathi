import scale from "../assets/hero/scale-cutout.png";
import weights from "../assets/hero/weights-cutout.png";
import botanicalRight from "../assets/hero/botanical-right.png";
import botanicalLeft from "../assets/hero/botanical-left.png";

/* Shared visual panel for Login and Register — echoes the landing hero. */
export default function AuthArtwork({ register = false }) {
  return (
    <aside className={`auth-artwork ${register ? "auth-artwork--register" : ""}`} aria-label="Precision weighing instrument">
      <div className="auth-artwork__wash" aria-hidden="true" />
      <img className="auth-artwork__botanical" src={botanicalRight} alt="" aria-hidden="true" />
      <img className="auth-artwork__botanical auth-artwork__botanical--left" src={botanicalLeft} alt="" aria-hidden="true" />

      <div className="auth-artwork__stage">
        <div className="auth-artwork__glow" aria-hidden="true" />
        <img className="auth-artwork__scale" src={scale} alt="A precision balance used for instrument verification" />
        <img className="auth-artwork__weights" src={weights} alt="" aria-hidden="true" />

        <svg className="auth-artwork__lines" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 50H260" />
        </svg>

        <div className="auth-tag auth-tag--spec" aria-hidden="true">
          <strong>Class III</strong>
          <span>Max: 30 kg</span>
          <span>Min: 20 g</span>
          <span>e = 5 g</span>
        </div>
        <div className="auth-tag auth-tag--oiml" aria-hidden="true">OIML R76</div>
        <div className="auth-tag auth-tag--load" aria-hidden="true">
          <b>1000.000 g</b>
          <span><i /> Stable</span>
        </div>
      </div>

      <div className="auth-artwork__caption">
        <span>Precision builds trust</span>
        <p>Accurate<br />measurements.<br />Safer markets.</p>
      </div>
    </aside>
  );
}
