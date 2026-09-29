import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import botanicalLeft from "../../assets/hero/botanical-left.png";
import botanicalRight from "../../assets/hero/botanical-right.png";
import benchScale from "../../assets/hero/scale2.png";
import precisionScale from "../../assets/hero/scale.png";
import weights from "../../assets/hero/weights.png";
import "./Landing.css";

const capabilities = [
  ["planning", "Automated", "Test Plans"],
  ["calculation", "R76 Intelligence &", "Rounding Trap"],
  ["report", "Tamper-Evident", "Reports"],
  ["repository", "Complete", "Audit Trail"],
];

const workflows = [
  {
    title: "The old way",
    tone: "old",
    steps: [
      ["Paper", "Manual entries, chances of error."],
      ["Excel", "Data scattered, hard to track."],
      ["Manual Math", "Time consuming, error prone."],
      ["Manual Verdict", "Subjective & inconsistent."],
      ["Report", "Delayed, not verified."],
    ],
  },
  {
    title: "With ScaleSaathi",
    tone: "new",
    steps: [
      ["Register", "Specifications validated live."],
      ["Test", "R76-compliant plan, guided entry."],
      ["Calculate", "Rule-based evaluation."],
      ["Review", "Maker–checker approval."],
      ["Report", "Verified and tamper-evident."],
    ],
  },
];

const storyIcons = ["document", "excel", "math", "verdict", "report"];

const features = [
  ["registration", "Instrument", "Registration", "Validate specifications with live checks."],
  ["planning", "Automatic", "Test Planning", "Generate R76-compliant test plans."],
  ["calculation", "R76-based", "Calculations", "Accurate, rule-based evaluation."],
  ["mpe", "MPE", "Evaluation", "Compare with limits and standards."],
  ["result", "Pass / Fail", "", "Clear, visual results for every test."],
  ["review", "Reviewer", "Approval", "Maker–checker workflow with comments."],
  ["report", "Verified", "Reports", "Official, tamper-evident certificates."],
  ["repository", "Repository &", "History", "Search, filter, export and track."],
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
    strokeWidth: 1.4,
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

/* Count a number up once when it scrolls into view. */
function CountUp({ to, duration = 1100, decimals = 0 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return undefined;

    let raf = 0;
    setValue(0);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(to * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

function HeroArtwork() {
  return (
    <div className="landing__art" aria-hidden="true">
      <img className="landing__botanical landing__botanical--right" src={botanicalRight} alt="" data-depth="0.25" />
      <img className="landing__botanical landing__botanical--left" src={botanicalLeft} alt="" data-depth="0.4" />

      <div className="instrument" data-depth="0.9">
        <div className="instrument__glow" />
        <img className="instrument__scale" src={precisionScale} alt="" />
        <img className="instrument__weights" src={weights} alt="" />
        <img className="instrument__bench" src={benchScale} alt="" />

        {/* fine technical layers */}
        <svg className="instrument__lines" viewBox="0 0 520 560" fill="none">
          <path className="draw" d="M8 92H120L150 126" />
          <path className="draw" d="M430 250 L470 250 L500 300" />
          <g className="ticks">
            {Array.from({ length: 21 }).map((_, i) => (
              <path key={i} d={`M${20 + i * 24} 546v${i % 5 === 0 ? 12 : 6}`} />
            ))}
          </g>
        </svg>

        <div className="tag tag--spec">
          <strong>Class III</strong>
          <span>Max: 30 kg</span>
          <span>Min: 20 g</span>
          <span>e = 5 g</span>
        </div>
        <div className="tag tag--oiml">OIML R76</div>
        <div className="tag tag--load">
          <b><CountUp to={1000} decimals={3} /> g</b>
          <span><i /> Stable</span>
        </div>
        <ul className="instrument__legend">
          <li>Precision</li>
          <li>Compliance</li>
          <li>Trust</li>
        </ul>
      </div>
    </div>
  );
}

function ProductStory() {
  return (
    <section className="landing-section story-section" id="product-story" aria-labelledby="story-title">
      <img className="story-section__leaf" src={botanicalLeft} alt="" aria-hidden="true" />
      <div className="section-shell story-layout">
        <header className="section-heading" data-reveal>
          <p className="section-kicker"><span>02</span> Product Story</p>
          <h2 id="story-title">From paper<br />to precision.</h2>
          <p className="section-deck">Same goal. A better way.</p>
        </header>

        <div className="workflow-list" aria-label="Manual and digital testing workflows">
          {workflows.map((workflow, wi) => (
            <div className={`workflow-band workflow-band--${workflow.tone}`} key={workflow.title}>
              <h3 data-reveal>{workflow.title}</h3>
              <ol className="workflow-band__steps">
                {workflow.steps.map(([title, text], i) => (
                  <li className="stage" key={title} data-reveal style={{ "--i": i + wi * 2 }}>
                    <span className="stage__num">0{i + 1}</span>
                    <LineIcon name={storyIcons[i]} className="stage__icon" />
                    <strong>{title}</strong>
                    <p>{text}</p>
                    {i < workflow.steps.length - 1 && <span className="stage__arrow" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="landing-section features-section" id="features" aria-labelledby="features-title">
      <div className="section-shell features-layout">
        <header className="section-heading section-heading--compact" data-reveal>
          <p className="section-kicker"><span>03</span> Features</p>
          <h2 id="features-title">Built for every step<br />of a verified test.</h2>
          <p className="section-deck section-deck--body">
            From instrument registration to verified reports, ScaleSaathi makes metrology
            simple, accurate and transparent.
          </p>
        </header>

        <div className="feature-grid">
          {features.map(([icon, first, second, text], index) => (
            <article className="feature-tile" key={first + second} data-reveal style={{ "--i": index }}>
              <span className="feature-tile__index">0{index + 1}</span>
              <LineIcon name={icon} className="feature-tile__icon" />
              <h3>{first}{second && <><br />{second}</>}</h3>
              <p>{text}</p>
              <span className="feature-tile__arrow" aria-hidden="true">→</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoundingTrapSection() {
  const [activeStage, setActiveStage] = useState(2);
  const [played, setPlayed] = useState(false);
  const demoRef = useRef(null);

  /* Play the reveal sequence once when the demo scrolls into view. */
  useEffect(() => {
    const el = demoRef.current;
    if (!el) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setPlayed(true);
      return undefined;
    }
    const timers = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setActiveStage(0);
      setPlayed(true);
      timers.push(setTimeout(() => setActiveStage(1), 1100));
      timers.push(setTimeout(() => setActiveStage(2), 2300));
    }, { threshold: 0.45 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const reached = (n) => activeStage >= n;

  return (
    <section className="landing-section rounding-section" id="rounding-trap" aria-labelledby="rounding-title">
      <div className="section-shell rounding-layout">
        <header className="section-heading rounding-section__heading" data-reveal>
          <p className="section-kicker"><span>04</span> Rounding Trap Signature</p>
          <h2 id="rounding-title">A displayed value<br />isn’t always the truth.</h2>
          <p className="section-deck">
            The R76 changeover-point method reveals the real value — and prevents costly errors.
          </p>
        </header>

        <div className="rounding-demo" data-played={played ? "true" : "false"} data-reveal ref={demoRef}>
          <div className="rounding-demo__steps" role="group" aria-label="Rounding trap demonstration stages">
            <button
              className={`rounding-card rounding-card--display ${activeStage === 0 ? "is-active" : ""} ${reached(0) ? "is-reached" : ""}`}
              type="button"
              aria-pressed={activeStage === 0}
              onClick={() => setActiveStage(0)}
            >
              <LineIcon name="scale" />
              <span className="rounding-card__label">Scale Display</span>
              <strong>1000 <small>g</small></strong>
              <span className="rounding-card__hint">Actual load: 1005 g</span>
            </button>
            <span className={`rounding-demo__arrow ${reached(1) ? "is-lit" : ""}`} aria-hidden="true" />
            <button
              className={`rounding-card rounding-card--naive ${activeStage === 1 ? "is-active" : ""} ${reached(1) ? "is-reached" : ""}`}
              type="button"
              aria-pressed={activeStage === 1}
              onClick={() => setActiveStage(1)}
            >
              <LineIcon name="calculator" />
              <span className="rounding-card__label">Naive Calculation</span>
              <strong className="result-pill result-pill--pass">PASS</strong>
              <span className="rounding-card__hint">Based on displayed value</span>
            </button>
            <span className={`rounding-demo__arrow ${reached(2) ? "is-lit" : ""}`} aria-hidden="true" />
            <button
              className={`rounding-card rounding-card--r76 ${activeStage === 2 ? "is-active" : ""} ${reached(2) ? "is-reached" : ""}`}
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
                <tr>
                  <td>1005 g</td>
                  <td><span className="table-result table-result--pass">PASS</span></td>
                  <td><span className="table-result table-result--fail">FAIL</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <img className="rounding-section__weights" src={weights} alt="" aria-hidden="true" />
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

  /* scroll-triggered reveals */
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

  /* hero parallax: pointer + scroll drive CSS custom properties */
  useEffect(() => {
    const root = landingRef.current;
    if (!root) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const hero = root.querySelector(".landing__hero");
    if (!hero) return undefined;
    let raf = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      raf = 0;
      const scroll = Math.min(window.scrollY, 800);
      hero.style.setProperty("--px", px.toFixed(3));
      hero.style.setProperty("--py", py.toFixed(3));
      hero.style.setProperty("--sy", `${(scroll * 0.12).toFixed(1)}px`);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    };

    hero.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      hero.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className="landing" ref={landingRef}>
      <section className="landing__hero" id="top">
        <HeroArtwork />

        <div className="landing__copy">
          <p className="landing__eyebrow"><span className="landing__eyebrow-mark" aria-hidden="true" />Legal Metrology <i>•</i> Digital Testing</p>
          <h1 className="landing__headline">
            Measure Right.
            <br />
            Verify with
            <br />
            <em>Confidence.</em>
          </h1>
          <p className="landing__description">
            ScaleSaathi is your digital companion for weighing instrument testing,
            verification and reporting — built for Indian laboratories.
          </p>

          <div className="landing__actions">
            <Link className="landing__button landing__button--primary" to="/register">
              Start Testing <span aria-hidden="true">→</span>
            </Link>
            <a className="landing__button landing__button--secondary" href="#product-story">
              See How It Works
            </a>
          </div>

          <ul className="landing__capabilities" id="capabilities">
            {capabilities.map(([icon, first, second]) => (
              <li key={first + second}>
                <LineIcon name={icon} />
                <span>{first}<br />{second}</span>
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
