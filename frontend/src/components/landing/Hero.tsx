import { BalanceIllustration, CornerScale, PrecisionCaption } from "./HeroIllustration";
import "./Hero.css";

const SUPPORT_LABELS = [
  { title: "Instrument", sub: "Testing" },
  { title: "Quality", sub: "Assurance" },
  { title: "Compliance", sub: "Reports" },
];

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero__stage">
        <div className="hero__copy">
          <p className="hero__eyebrow">Digital Legal Metrology</p>

          <h1 className="hero__headline">
            Measure Right.
            <br />
            Verify with Confidence
          </h1>

          <p className="hero__lead">
            ScaleSaathi is your digital companion for weighing instrument
            testing, verification and reporting — built for Indian
            laboratories.
          </p>

          <div className="hero__actions">
            <a className="hero__cta hero__cta--primary" href="#start-testing">
              Start Testing
            </a>
            <a className="hero__cta hero__cta--secondary" href="#how-it-works">
              See How It Works
            </a>
          </div>
        </div>

        <div className="hero__art">
          <div className="hero__caption">
            <PrecisionCaption />
          </div>
          <BalanceIllustration />
        </div>
      </div>

      <div className="hero__strip">
        <div className="hero__strip-inner">
          <div className="hero__corner-scale" aria-hidden="true">
            <CornerScale />
          </div>
          <ul className="hero__labels">
            {SUPPORT_LABELS.map((item) => (
              <li key={item.title} className="hero__label">
                <span>{item.title}</span>
                <span>{item.sub}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
