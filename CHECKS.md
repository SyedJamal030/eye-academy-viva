# Assignment Verification Checks

## Prerequisites

1. Start the local server (`npm run dev`).
2. Sign in/Sign up with your account and start a new viva attempt.

---

## Check 1: Available Examination Finding

- **Prompt (spoken or typed):** `"What is the eye pressure in the right eye?"`
- **Expected Result:**
  - Examiner reads back the right-eye intraocular pressure with exact eye, value, and units (`58 mmHg` via Goldmann applanation at `23:55`) and asks one follow-up question.
  - The finding appears under **Revealed Examination Findings** marked **Available**.
- **Observed Result:**
  - Examiner returned `58 mmHg` via Goldmann applanation at `23:55` for the right eye and asked a single follow-up question.
  - Logged on screen as **Available** (`Right eye · Intraocular pressure · 58 mmHg`).

---

## Check 2: Unavailable Examination Finding

- **Prompt (spoken or typed):** `"What are the urea and electrolytes?"` (or `"Can I have the OCT scan?"`)
- **Expected Result:**
  - Examiner states that the finding is unavailable along with the case's stated reason without fabricating values, and asks one follow-up question.
  - The finding appears under **Revealed Examination Findings** marked **Unavailable**.
- **Observed Result:**
  - For urea and electrolytes, examiner reported it as unavailable (`Bloods sent, results pending`) with no invented values and asked one follow-up question (`Last turn: 7901 ms`).
  - Logged on screen as **Unavailable**.

---

## Check 3: Reference Note Revision Point, Citation & Persistence

- **Prompt (spoken or typed):**
  > `"My diagnosis is acute angle closure in the right eye. I would lower the eye pressure with acetazolamide and eye drops, and arrange laser peripheral iridotomy for both eyes."`
- **Action:** Click **Generate Revision Point**, then refresh the browser (`F5`).
- **Expected Result:**
  - App retrieves relevant passages from `glaucoma-reference-pages.json` and generates one revision point with a page number and verbatim supporting excerpt (or states if unsupported).
  - Reloading the page preserves the saved attempt, transcript, revealed findings, and revision point for the signed-in owner.
- **Observed Result:**
  - **Retrieved pages:** `[7]`
  - **Cited page & excerpt:** Page 7 — `"Indications After acute primary angle closure, in both eyes"`, supporting the takeaway to arrange bilateral laser peripheral iridotomy following acute primary angle closure.
  - **Persistence:** Refreshing the page (`F5`) reloaded the attempt with full transcript, revealed findings, and the Page 7 revision point intact.
