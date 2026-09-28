# ScaleSaathi: Calculation Methodology

NAWI Test Report Generation Software, OIML R 76 compliance · SIH 2026, PS 26035 · Team InnoVexa · Rule engine (P1)

## 1. Purpose and scope

The ScaleSaathi rule engine turns raw type-evaluation readings into pass/fail verdicts exactly as OIML R 76-1 (2006) prescribes, and shows the working for every verdict. It checks the declared specification, generates the test plan, computes each error by the changeover-point method, compares it with the maximum permissible error (MPE), and records the clause behind every decision.

This document explains the mathematics and rules. The companion document, *System Architecture & Deployment*, covers the backend, data model, security and hosting. The engine is a pure Python package (`engine/`) with no network or database access, so every result can be reproduced from its inputs alone.

All limits come from a versioned, clause-tagged ruleset file (`engine/rulesets/oiml_r76_v1.json`). Every value in it was checked against the official OIML R 76-1:2006 text.

## 2. Units, symbols and inputs

Every mass is in grams and every temperature in °C. The frontend converts kilograms once, at data entry. Inputs that are NaN or infinite are rejected before any calculation.

| Symbol | Meaning | Source |
| --- | --- | --- |
| Max, Min | Maximum and minimum capacity | Declared specification |
| e | Verification scale interval | Declared specification |
| d | Actual scale interval (display resolution); equals e unless stated | Declared specification |
| n | Number of verification scale intervals, n = Max / e | Calculated |
| m | A load expressed in intervals, m = L / e | Calculated |
| L | Test load placed on the instrument | Observation |
| I | Indication shown by the instrument | Observation |
| ΔL | Total small weights added until the indication steps up by one interval | Observation (changeover method) |
| E | Error of one reading, prior to rounding | Calculated |
| E0 | Error at or near zero (for example at 10e) | Observation, optional |
| Ec | Corrected error, E − E0 | Calculated |
| MPE | Maximum permissible error for the load | Ruleset (Table 6) |

## 3. Specification checks before testing

A specification that does not fit its declared class makes every later test meaningless, so the engine checks it the moment it is entered. Each problem is returned with the form field it belongs to and the clause it breaks; any error blocks registration.

| Check | Rule | Clause |
| --- | --- | --- |
| Interval form | e = 1, 2 or 5 × 10^k | R76-1 4.2.2.1 |
| Auxiliary indication | d ≤ e; classes III and IIII must have e = d (only classes I and II may have an auxiliary indicating device) | R76-1 3.1.2 Table 2, 3.4.1 |
| Whole intervals | Max / e must be a whole number | R76-1 3.2, Table 3 |
| Number of intervals | n within the class band's minimum and maximum | R76-1 3.2, Table 3 |
| Minimum capacity | Min ≥ the class band's Min, in multiples of e | R76-1 3.2, Table 3 |
| Temperature range | Declared range at least 5 °C (class I), 15 °C (class II), 30 °C (classes III, IIII); default −10 °C to +40 °C | R76-1 3.9.2.1, 3.9.2.2 |

The class bands used for the n and Min checks are:

| Class | e | n minimum | n maximum | Min |
| --- | --- | --- | --- | --- |
| I | ≥ 0.001 g | 50 000 | — | 100e |
| II | 0.001 g to 0.05 g | 100 | 100 000 | 20e |
| II | ≥ 0.1 g | 5 000 | 100 000 | 50e |
| III | 0.1 g to 2 g | 100 | 10 000 | 20e |
| III | ≥ 5 g | 500 | 10 000 | 20e |
| IIII | ≥ 5 g | 100 | 1 000 | 10e |

Example: class III, e = 5 g, Max = 100 kg gives n = 20 000, above the class III limit of 10 000, so the specification is rejected before any test is run.

## 4. Maximum permissible errors

The MPE for a reading depends on the class and on the load counted in intervals, m = L / e (R76-1 3.5.1, Table 6). The engine finds the first band whose upper limit is at or above m; a load exactly on a boundary belongs to the lower band.

| MPE | Class I | Class II | Class III | Class IIII |
| --- | --- | --- | --- | --- |
| ±0.5e | 0 ≤ m ≤ 50 000 | 0 ≤ m ≤ 5 000 | 0 ≤ m ≤ 500 | 0 ≤ m ≤ 50 |
| ±1e | 50 000 < m ≤ 200 000 | 5 000 < m ≤ 20 000 | 500 < m ≤ 2 000 | 50 < m ≤ 200 |
| ±1.5e | 200 000 < m | 20 000 < m ≤ 100 000 | 2 000 < m ≤ 10 000 | 200 < m ≤ 1 000 |

Example (class III, e = 5 g): 2 500 g is 500e, so MPE = ±2.5 g; 2 505 g is 501e, so MPE = ±5 g. The allowed error doubles across one interval, which is why the test plan targets these boundaries (Section 8).

These are the limits for type evaluation and initial verification. In service the MPE is twice these values (R76-1 3.5.2). The engine uses this to explain its marginal-pass warning (Section 7).

## 5. Error determination: the changeover-point method

A digital display rounds to the nearest interval, so "indication minus load" can be wrong by up to half an interval. R 76-1 requires this rounding error to be eliminated whenever d > 0.2e (3.5.3.2), which covers almost every commercial digital scale. The engine therefore computes errors by the changeover-point method of R76-1 A.4.4.3.

At load L the indication I is noted. Small weights of about 0.1e are added until the indication increases unambiguously by one interval. With ΔL the total added:

```math
P = I + \tfrac{1}{2}e - \Delta L
```

```math
E = P - L = I + \tfrac{1}{2}e - \Delta L - L
```

```math
E_c = E - E_0 \le \text{MPE}
```

P is the indication prior to rounding and E0 is the error at or near zero. The engine reproduces the worked example printed in A.4.4.3 exactly: e = 5 g, L = 1 000 g, I = 1 000 g and ΔL = 1.5 g give P = 1 001 g and E = +1 g; with E0 = +0.5 g, Ec = +0.5 g.

### The rounding trap

The engine also computes the naive error, I − L, and flags every reading where the two methods disagree. Disagreement happens in both directions:

| Case | L | I | ΔL | MPE | Naive error | True error E | Consequence of the naive method |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Faulty scale approved | 5 000 g | 5 005 g | 0.5 g | ±5 g | +5 g, PASS | +7 g, FAIL | A scale outside the limit is approved |
| Good scale rejected | 1 000 g | 1 005 g | 5 g | ±2.5 g | +5 g, FAIL | +2.5 g, PASS | A compliant scale is rejected |

Both rows use a class III scale with e = d = 5 g. Every result stores the naive error, the true error and the method used, so reports and the interface can show the comparison directly.

If ΔL is not entered, the engine falls back to the naive error and adds a warning citing 3.5.3.2, so a non-compliant result is never presented as compliant.

## 6. Per-test evaluation rules

Each test produces one or more results, and every result carries the error, the limit, the verdict, the clause and a plain-English explanation. A reading passes when |error| ≤ limit.

| Test | What is compared | Limit | Clause |
| --- | --- | --- | --- |
| Weighing | Ec of each reading, increasing and decreasing loads | MPE for that load | R76-1 A.4.4, 3.5.1 Table 6 |
| Eccentricity | Ec at the centre and each segment (or over each support) | MPE for the eccentricity load | R76-1 3.6.2.1, 3.6.2.2, A.4.7 |
| Repeatability | Spread (largest − smallest error) of repeated weighings of one load | \|MPE\| for that load | R76-1 3.6.1, A.4.10 |
| Discrimination | Change in indication after adding 1.4d at equilibrium | Must change by at least d | R76-1 3.8.2.2, A.4.8 |
| Zero-setting accuracy | Error after zero setting, by changeover | ±0.25e | R76-1 4.5.2, A.4.2.3 |
| Tare-setting accuracy | Error after tare setting, by changeover | ±0.25e (electronic instruments) | R76-1 4.6.3, A.4.6.2 |
| Static temperature | Ec of weighing readings at each test temperature | MPE for each load | R76-1 A.5.3.1, 3.5.1 |
| Temperature effect on zero | Change in zero error between consecutive test temperatures | 1e per 1 °C (class I), 1e per 5 °C (others) | R76-1 3.9.2.3 |
| Disturbances | Difference in indication with and without the disturbance | A significant fault is anything above e | R76-1 T.5.5.6 |

Notes on individual tests:

- **Repeatability** uses 10 weighings per series for type approval when Max < 1 000 kg, otherwise at least 3, in two series near 50% and 100% of Max (A.4.10).
- **Zero and tare setting** require ΔL: a rounded display cannot resolve 0.25e, so a reading without it is marked failed with that reason.
- **Temperature effect on zero** example: a zero error that moves 12 g between 20 °C and 25 °C, on a scale with e = 5 g, exceeds the allowed 5 g and fails.
- **Disturbances** are recorded from the laboratory test sheet; the engine applies the significant-fault rule but does not model the disturbance itself.
- **Tare setting** on mechanical instruments with digital indication uses ±0.5d instead; this case is not modelled in the prototype.

## 7. Reading validation, verdict and warnings

The overall verdict is PASS only when the specification is valid, every reading is valid, weighing data exists, and every test result passes. Otherwise it is FAIL or INCOMPLETE, and the reason is always stated.

**Reading validation.** Before evaluation, every reading is checked against the instrument. The backend runs the same checks when readings are saved and rejects errors immediately.

| Rule | Why |
| --- | --- |
| Load ≤ Max + maximum additive tare | The instrument cannot carry more |
| Indication is a multiple of d | The display cannot show any other value |
| ΔL ≤ e | The display must step up within one interval; more means a recording error |

**Overall verdict.**

| Verdict | When |
| --- | --- |
| FAIL | The specification is invalid, or any test result fails |
| INCOMPLETE | A reading is invalid (verdict withheld until fixed), or no weighing readings exist yet |
| PASS | None of the above |

**Marginal results.** A passing result that uses 80% or more of its limit is flagged as marginal for reviewer attention. This is ScaleSaathi's own advisory threshold, not an R 76 requirement: because in-service limits are only twice the type-evaluation limits (3.5.2), a scale that barely passes is at risk of failing once in use.

**Warnings** cover coverage gaps rather than failures: fewer than 10 weighing loads (A.4.4.1), Max missing from the weighing test, fewer repeatability weighings than required, test temperatures outside the declared range, and readings without ΔL where 3.5.3.2 requires rounding to be eliminated.

## 8. Test plan generation

From Max, Min, e, class, tare and support points, the engine generates a complete test plan, so the officer does not need to consult the standard. A.4.4.1 requires at least 10 test loads including Max, Min and values at or near those where the MPE changes; the plan meets this by construction.

| Test | Plan |
| --- | --- |
| Weighing | Min, each MPE band boundary and the load one interval above it, 50% of Max, Max, then round intermediate loads until there are at least 10 |
| Eccentricity | One third of (Max + maximum additive tare) at the centre and 4 segments for up to 4 supports; (Max + tare) / (n − 1) over each support for more than 4 |
| Repeatability | Two series, at about 50% and 100% of Max, with the required number of weighings |
| Discrimination | Min, 50% of Max and Max, with an extra load of 1.4d |
| Zero and tare setting | Limit of ±0.25e |
| Static temperature | Reference, upper limit, lower limit, 5 °C (only if the lower limit ≤ 0 °C), reference; weigh Min, 50% of Max and Max at each, plus a zero reading |
| Disturbances | Voltage dips and short interruptions, electrical fast transients, surges, electrostatic discharge, radiated and conducted electromagnetic fields |

The reference temperature is 20 °C, or the mean of the limits for class I (A.5.3.1). Every test load is rounded to a whole number of intervals.

Example for class III, Max 15 kg, Min 100 g, e = 5 g: weighing loads 100, 2 500, 2 505, 5 000, 6 200, 7 500, 10 000, 10 005, 12 500 and 15 000 g; eccentricity load 5 000 g; repeatability 2 × 10 weighings at 7 500 g and 15 000 g; temperatures 20, 40, −10, 5 and 20 °C.

## 9. Ruleset versioning and impact analysis

No metrological value is hard-coded. Every limit, band and test parameter lives in a versioned JSON ruleset, so a revised OIML edition becomes a new file rather than a code change, as the problem statement requires.

- **Clause tags.** Every value carries the R 76-1 clause it comes from; that clause is printed with every verdict.
- **Verification flags.** Every value has a `verified` flag, set to true only after checking it against the official text. The engine can list any unverified items; for v1 the list is empty.
- **Version stamp.** Every verdict records the ruleset id and version it was evaluated under, and reports print it.
- **Impact analysis.** When a new version is uploaded, the engine re-evaluates stored sessions under both versions and lists every verdict and test result that would change. Nothing stored is modified; it is a dry run.

For the demonstration, `oiml_r76_v2_demo.json` is a **hypothetical** revision, not a real OIML edition. It is identical to v1 except that the class III MPE for loads up to 500e is tightened from 0.5e to 0.4e. Under it, exactly one previously approved sample instrument (a +2.5 g error at 2 500 g, e = 5 g) changes from PASS to FAIL, which shows the lab which past approvals a revision would affect.

## 10. Validation

The engine is validated by 36 automated test cases, all passing, plus 11 end-to-end backend tests that run the engine through the full workflow.

- **Against the standard.** Every ruleset value and clause was checked against the official OIML R 76-1:2006 text, including Tables 3 and 6 and Annex A.
- **Against the standard's own example.** The engine reproduces the worked example in A.4.4.3 exactly (E = +1 g, Ec = +0.5 g).
- **Hand-calculated cases.** Expected values were computed by hand from the R 76 formulas: both rounding-trap directions, loads exactly on and just above band boundaries, marginal passes, zero correction, eccentricity, repeatability, discrimination, zero and tare accuracy, temperature drift, disturbances, invalid specifications and invalid readings.
- **Demo data.** Nine labelled sample sessions each produce their expected verdict, confirmed by an automated test.
- **Robustness.** NaN and infinite inputs are rejected, and every output is valid strict JSON.
- **Impact analysis.** The hypothetical v2 ruleset flips exactly the one session it should, and nothing else.

The tests run with `python -m pytest tests -q` from the repository root.

## 11. Limitations and references

The prototype covers single-range instruments of all four accuracy classes. The following are outside its current scope and are on the roadmap:

- Multi-interval and multiple-range instruments
- Mechanical instruments with digital indication (±0.5d tare accuracy)
- Creep, zero return, tilting, warm-up time and durability tests
- Automatic checking of the test weights' own accuracy against the instrument's MPE
- Modelling of disturbance tests; they are recorded from the lab sheet and judged by the significant-fault rule

**References**

- OIML R 76-1:2006, Non-automatic weighing instruments, Part 1: Metrological and technical requirements, Tests ([oiml.org](https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf))
- OIML R 76-2, Part 2: Test report format
- Legal Metrology Act, 2009, and Legal Metrology (General) Rules, 2011
- SIH 2026 Problem Statement 26035, Ministry of Consumer Affairs, Food & Public Distribution
