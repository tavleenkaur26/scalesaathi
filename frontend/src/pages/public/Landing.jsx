import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import botanicalLeft from "../../assets/hero/botanical-left.png";
import botanicalRight from "../../assets/hero/botanical-right.png";
import benchScale from "../../assets/hero/scale2.png";
import precisionScale from "../../assets/hero/scale.png";
import weights from "../../assets/hero/weights.png";
import "./Landing.css";

const capabilities = [
  ["Instrument", "Testing"],
  ["Quality", "Assurance"],
  ["Compliance", "Reports"],
];

const workflows = [
  {
    title: "The old way",
    tone: "old",
    steps: ["Paper", "Excel", "Manual Math", "Manual Verdict", "Report"],
  },
  {
    title: "With ScaleSaathi",
    tone: "new",
    steps: ["Register", "Test", "Calculate", "Review", "Report"],
  },
];

const features = [
  ["registration", "Instrument", "Registration", "eucalyptus"],
  ["planning", "Automatic", "Test Planning", "peach"],
  ["calculation", "R76-based", "Calculations", "pistachio"],
  ["mpe", "MPE", "Evaluation", "peach"],
  ["result", "Pass / Fail", "", "peach"],
  ["review", "Reviewer", "Approval", "eucalyptus"],
  ["report", "Verified", "Reports", "peach"],
  ["repository", "Repository &", "History", "pistachio"],
];

const trapStages = [
  "A 1005 g load rounds to a displayed value of 1000 g.",
  "A check using only the displayed value appears to pass.",
  "The R76 changeover-point method reveals the out-of-tolerance load.",
];

function LineIcon({ name, className = "" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.55,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const drawings = {
    document: <><path d="M12 4h9l5 5v15H12z" /><path d="M21 4v6h5M16 15h6M16 19h6" /></>,
    excel: <><rect x="8" y="5" width="18" height="21" rx="1" /><path d="M13 11l8 9m0-9-8 9M5 9v15" /></>,
    math: <><rect x="8" y="4" width="18" height="24" rx="2" /><path d="M12 8h10v5H12zM13 18h2m4 0h2m-8 5h2m4 0h2" /></>,
    verdict: <><rect x="7" y="5" width="20" height="23" rx="2" /><path d="M12 12h10m-10 5 3 3 7-7" /></>,
    report: <><path d="M9 4h12l5 5v19H9z" /><path d="M21 4v6h5M13 15h9m-9 5h9" /></>,
    registration: <><rect x="8" y="4" width="18" height="24" rx="1" /><path d="M12 10h10m-10 5h10m-10 5h5M5 8v20h17" /></>,
    planning: <><rect x="6" y="7" width="22" height="20" rx="2" /><path d="M11 4v6m12-6v6M6 13h22m-15 5h2m5 0h2m-9 4h2" /></>,
    calculation: <><rect x="8" y="4" width="18" height="24" rx="2" /><path d="M12 8h10v4H12zM13 17h2m4 0h2m-8 5h2m4 0h2" /></>,
    mpe: <><path d="M6 16h5l3-7 5 14 3-7h5" /><path d="M7 5h20v22H7z" /></>,
    result: <><circle cx="17" cy="16" r="11" /><path d="m12 16 3 3 7-7" /><path d="M17 2v3" /></>,
    review: <><circle cx="15" cy="10" r="5" /><path d="M6 27c1-5 4-8 9-8 3 0 5 1 7 3m-1 4 3 3 6-7" /></>,
    repository: <><path d="M6 9h22v18H6zM9 5h16v4M11 14h12m-12 5h12m-12 4h7" /></>,
    scale: <><path d="M17 5v17m-9-13h18M9 9l-5 9h10L9 9Zm16 0-5 9h10l-5-9ZM11 27h12" /></>,
    calculator: <><rect x="8" y="3" width="18" height="27" rx="2" /><path d="M12 8h10v5H12zM13 18h1m5 0h1m-7 5h1m5 0h1" /></>,
  };

  const drawing = drawings[name] || drawings.document;
  return (
    <svg className={`line-icon ${className}`} viewBox="0 0 34 34" aria-hidden="true" {...common}>
      {drawing}
    </svg>
  );
}

function HeroArtwork() {
  return (
    <div className="landing__art" aria-hidden="true">
      <img className="landing__botanical landing__botanical--right" src={botanicalRight} alt="" />
      <img className="landing__precision-scale" src={precisionScale} alt="" />
      <img className="landing__weights" src={weights} alt="" />
      <img className="landing__botanical landing__botanical--left" src={botanicalLeft} alt="" />
      <img className="landing__bench-scale" src={benchScale} alt="" />
    </div>
  );
}

function WorkflowBand({ workflow, index }) {
  return (
    <div className={`workflow-band workflow-band--${workflow.tone}`} data-reveal>
      <h3>{workflow.title}</h3>
      <ol className="workflow-band__steps">
        {workflow.steps.map((step, stepIndex) => (
          <li key={step}>
            <LineIcon name={["document", "excel", "math", "verdict", "report"][stepIndex]} />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <span className="sr-only">Workflow {index + 1} of 2</span>
    </div>
  );
}

function ProductStory() {
  return (
    <section className="landing-section story-section" id="product-story" aria-labelledby="story-title">
      <div className="section-shell">
        <header className="section-heading" data-reveal>
          <p className="section-kicker"><span>02</span> Product Story / Problem</p>
          <h2 id="story-title">From paper<br />to precision.</h2>
          <p className="section-deck">Same goal. A better way.</p>
        </header>

        <div className="workflow-list" aria-label="Manual and digital testing workflows">
          {workflows.map((workflow, index) => (
            <WorkflowBand key={workflow.title} workflow={workflow} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="landing-section features-section" id="features" aria-labelledby="features-title">
      <div className="section-shell">
        <header className="section-heading section-heading--compact" data-reveal>
          <p className="section-kicker"><span>03</span> Features</p>
          <h2 id="features-title">Built for every step<br />of a verified test.</h2>
        </header>

        <div className="feature-grid">
          {features.map(([icon, first, second, tone], index) => (
            <article className={`feature-tile feature-tile--${tone}`} key={first + second} data-reveal>
              <LineIcon name={icon} className="feature-tile__icon" />
              <h3>{first}{second && <><br />{second}</>}</h3>
              <span className="feature-tile__index">0{index + 1}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoundingTrapSection() {
  const [activeStage, setActiveStage] = useState(2);

  return (
    <section className="landing-section rounding-section" id="rounding-trap" aria-labelledby="rounding-title">
      <div className="section-shell">
        <header className="section-heading rounding-section__heading" data-reveal>
          <p className="section-kicker"><span>04</span> Rounding Trap Signature</p>
          <h2 id="rounding-title">A displayed value<br />isn’t always the truth.</h2>
        </header>

        <div className="rounding-demo" data-reveal>
          <div className="rounding-demo__steps" role="group" aria-label="Rounding trap demonstration stages">
            <button
              className={`rounding-card rounding-card--display ${activeStage === 0 ? "is-active" : ""}`}
              type="button"
              aria-pressed={activeStage === 0}
              onClick={() => setActiveStage(0)}
            >
              <LineIcon name="scale" />
              <span className="rounding-card__label">Scale Display</span>
              <strong>1000 <small>g</small></strong>
              <span className="rounding-card__hint">Actual load: 1005 g</span>
            </button>
            <span className="rounding-demo__arrow" aria-hidden="true">→</span>
            <button
              className={`rounding-card rounding-card--naive ${activeStage === 1 ? "is-active" : ""}`}
              type="button"
              aria-pressed={activeStage === 1}
              onClick={() => setActiveStage(1)}
            >
              <LineIcon name="calculator" />
              <span className="rounding-card__label">Naive Calculation</span>
              <strong className="result-pill result-pill--pass">PASS</strong>
              <span className="rounding-card__hint">Based on displayed value</span>
            </button>
            <span className="rounding-demo__arrow" aria-hidden="true">→</span>
            <button
              className={`rounding-card rounding-card--r76 ${activeStage === 2 ? "is-active" : ""}`}
              type="button"
              aria-pressed={activeStage === 2}
              onClick={() => setActiveStage(2)}
            >
              <LineIcon name="result" />
              <span className="rounding-card__label">R76 Changeover-Point Method</span>
              <strong className="result-pill result-pill--fail">FAIL</strong>
              <span className="rounding-card__hint">Evaluates the actual error</span>
            </button>
          </div>

          <p className="rounding-demo__explanation" aria-live="polite">
            {trapStages[activeStage]}
          </p>

          <div className="example-table-wrap">
            <h3>Example <span>(1005 g)</span></h3>
            <table className="example-table">
              <thead>
                <tr><th>Display</th><th>Naive Calculation</th><th>R76 Method</th></tr>
              </thead>
              <tbody>
                <tr><td>1005 g</td><td><span className="table-result table-result--pass">PASS</span></td><td><span className="table-result table-result--fail">FAIL</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCallToAction() {
  return (
    <section className="landing-final-cta" aria-label="Start using ScaleSaathi">
      <div className="section-shell landing-final-cta__inner" data-reveal>
        <div>
          <p className="section-kicker">ScaleSaathi</p>
          <h2>Measure. Verify. Trust.</h2>
          <p>Bring clarity and confidence to every instrument test.</p>
        </div>
        <Link className="landing-final-cta__button" to="/register">Get Started <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}

export default function Landing() {
  const landingRef = useRef(null);

  useEffect(() => {
    const root = landingRef.current;
    if (!root) return undefined;

    const elements = root.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    root.classList.add("landing--enhanced");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -30px 0px" });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing" ref={landingRef}>
      <section className="landing__hero" id="top">
        <HeroArtwork />

        <div className="landing__copy">
          <p className="landing__eyebrow">Digital Legal Metrology</p>
          <h1 className="landing__headline">
            Measure Right.
            <br />
            Verify with Confidence
          </h1>
          <p className="landing__description">
            ScaleSaathi is your digital companion for weighing instrument testing,
            verification and reporting — built for Indian laboratories.
          </p>

          <div className="landing__actions">
            <Link className="landing__button landing__button--primary" to="/register">
              Start Testing
            </Link>
            <a className="landing__button landing__button--secondary" href="#product-story">
              See How It Works
            </a>
          </div>

          <ul className="landing__capabilities" id="capabilities">
            {capabilities.map(([title, detail]) => (
              <li key={title}>
                <span>{title}</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ProductStory />
      <FeaturesSection />
      <RoundingTrapSection />
      <FinalCallToAction />
    </main>
  );
}

