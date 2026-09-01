# Good Times dependency remediation

This branch isolates the current GOOD TIMES dependency-security repair. The audit artifact captured a high-severity transitive `nanoid` finding (`GHSA-2v37-7h3g-55p8`, affected versions `<3.3.18`). The final merge must preserve exact-lock installation, require zero high/critical findings, and remain scoped to GOOD TIMES only.
