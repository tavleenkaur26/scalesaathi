"""Input and output shapes for the engine. This file IS the contract with P2 (backend)
and P3 (frontend). All masses are in grams; the frontend converts kg if needed."""
from typing import Literal, Optional
from pydantic import BaseModel, Field

AccuracyClass = Literal["I", "II", "III", "IIII"]
Outcome = Literal["PASS", "FAIL", "RECORDED"]


# ------------------------- inputs -------------------------

class InstrumentSpec(BaseModel):
    max_capacity: float = Field(gt=0, description="Max, in g")
    min_capacity: float = Field(gt=0, description="Min, in g")
    e: float = Field(gt=0, description="Verification scale interval, in g")
    d: Optional[float] = Field(default=None, gt=0, description="Actual scale interval; defaults to e")
    accuracy_class: AccuracyClass
    max_tare: float = Field(default=0, ge=0, description="Maximum additive tare, in g")
    support_points: int = Field(default=4, ge=1)
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None

    @property
    def actual_d(self) -> float:
        return self.d if self.d is not None else self.e


class Reading(BaseModel):
    """One observation. delta_l = total small weights added until the display
    changed over by one interval (changeover-point method). If delta_l is None,
    only the naive error (indication - load) can be computed."""
    load: float = Field(ge=0)
    indication: float
    delta_l: Optional[float] = Field(default=None, ge=0)
    label: Optional[str] = None  # e.g. "increasing", "decreasing", "centre", "corner 1"


class EccentricityInput(BaseModel):
    readings: list[Reading]  # one per position, label = position name


class RepeatabilitySeries(BaseModel):
    readings: list[Reading]  # same load weighed repeatedly


class DiscriminationInput(BaseModel):
    load: float
    indication_before: float
    indication_after: float  # after adding the extra 1.4 d load


class TemperatureRun(BaseModel):
    temperature: float
    readings: list[Reading] = []
    zero_reading: Optional[Reading] = None  # near-zero reading at this temperature


class DisturbanceInput(BaseModel):
    name: str  # e.g. "Voltage dip", "Electrostatic discharge"
    indication_without: float
    indication_with: float


class SessionInput(BaseModel):
    spec: InstrumentSpec
    zero_reference: Optional[Reading] = None  # E0 for corrected error (A.4.4.3)
    weighing: list[Reading] = []
    eccentricity: Optional[EccentricityInput] = None
    repeatability: list[RepeatabilitySeries] = []
    discrimination: list[DiscriminationInput] = []
    zero_setting: Optional[Reading] = None
    tare_setting: Optional[Reading] = None
    temperature: list[TemperatureRun] = []
    disturbances: list[DisturbanceInput] = []


# ------------------------- outputs -------------------------

class SpecIssue(BaseModel):
    field: str
    severity: Literal["error", "warning"]
    message: str
    clause: str


class SpecCheckResult(BaseModel):
    valid: bool
    n: float
    matched_band: Optional[dict] = None
    issues: list[SpecIssue] = []


class TestResult(BaseModel):
    test: str
    label: Optional[str] = None
    load: Optional[float] = None
    e: float
    error: Optional[float] = None          # R 76 method (changeover), corrected if E0 given
    naive_error: Optional[float] = None    # indication - load
    mpe: Optional[float] = None
    result: Outcome
    naive_result: Optional[Outcome] = None
    utilisation: Optional[float] = None    # |error| / mpe
    marginal: bool = False
    method: Literal["changeover", "naive", "direct"] = "direct"
    clause: str
    explanation: str


class Verdict(BaseModel):
    overall: Literal["PASS", "FAIL", "INCOMPLETE"]
    ruleset_id: str
    ruleset_version: str
    results: list[TestResult]
    failed_tests: list[str]
    marginal_results: int
    rounding_traps: int  # results where naive and R 76 method disagree
    warnings: list[str]
