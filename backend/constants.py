"""Shared constants. Status and role strings are part of the API contract with P3/P4."""

TESTER, REVIEWER, ADMIN = "Tester", "Reviewer", "Admin"
ROLES = (TESTER, REVIEWER, ADMIN)

DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED = (
    "Draft", "Submitted", "Under Review", "Approved", "Returned")
STATUSES = (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED)
EDITABLE = (DRAFT, RETURNED)            # tester may change readings / attachments
IN_PROGRESS = (DRAFT, RETURNED)         # dashboard grouping
IN_REVIEW = (SUBMITTED, UNDER_REVIEW)

# Observation "test" keys = the SessionInput fields in the engine contract (minus spec).
OBSERVATION_TESTS = (
    "zero_reference", "weighing", "eccentricity", "repeatability", "discrimination",
    "zero_setting", "tare_setting", "temperature", "disturbances")

ATTACHMENT_KINDS = ("photo", "document", "lab_sheet")
ALLOWED_UPLOADS = ("image/jpeg", "image/png", "application/pdf")
