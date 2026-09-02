# Approach, Assumptions & Limitations

## Approach

The system is deliberately **rule-based only** — no LLM or generative AI
API is called at any point, per the assignment's constraint. It's built in
three layers:

1. **Text extraction** — `pdfplumber` (with a `pypdf` fallback) for PDFs,
   `python-docx` for DOCX (paragraphs + table cells), normalized into
   plain text with line breaks preserved, since line position is used
   heavily downstream (e.g., the name is almost always the first line).

2. **Field extraction** — each field has its own dedicated strategy:
   - **Email / phone / LinkedIn / GitHub**: regex, since these have
     predictable formats.
   - **Name**: positional heuristic — scans the first ~10 non-empty lines,
     skips anything that looks like a header/email/URL/phone, and picks
     the first short, letters-only line (1–4 words). Falls back to
     deriving a name from the email's local-part if nothing matches.
   - **Skills**: matched against a curated ~150-term dictionary of
     technical and professional skills (languages, frameworks, cloud/DevOps,
     data/ML tools, soft skills, etc.) using word-boundary-safe regex, so
     it doesn't matter whether skills are comma-separated, bulleted, or
     embedded in prose. It also pulls extra free-text tokens out of a
     detected "Skills" section to catch terms not in the dictionary.
   - **Education / Experience**: the document is first scanned for section
     headers ("Education", "Skills", "Experience", etc.) to find each
     section's boundaries. Within the Education section, lines are matched
     against a degree-keyword list (B.Tech, MBA, M.Sc, PhD, etc.) and the
     following 1–2 lines are inspected for an institution name and a
     graduation year. Within the Experience section, lines are grouped
     into blocks: a short line or one containing a date range (e.g.
     "2020 - 2022") is treated as a new role header, and subsequent
     bullet/description lines are attached to it as details.

3. **Assembly** — all fields are combined into a single JSON object per
   resume, with a `_meta` block (source filename, extraction timestamp,
   characters extracted) for traceability.

The Flask app is a thin wrapper: it accepts uploads, calls the extractor,
and returns JSON — the UI renders that JSON as both readable "cards" and
raw JSON.

## Assumptions

- Resumes are **text-based**, not scanned images — this is a non-LLM
  rule-based system with no OCR step, so a scanned/photographed resume
  saved as PDF won't yield extractable text.
- Resumes are in **English** and follow broadly Western/Indian resume
  conventions (name at the top, clearly labeled sections).
- One resume = one candidate (no multi-candidate documents).
- "Skills" means both hard/technical skills and common soft skills, matched
  against a fixed dictionary — an unusual or highly niche skill not in the
  dictionary may only be caught if it appears inside a clearly labeled
  "Skills" section (via the free-text fallback), not if it's mentioned in
  prose elsewhere.

## Limitations

- **No OCR** — scanned/image PDFs return an explicit "no extractable text"
  error rather than silently producing empty results.
- **Name detection is heuristic**, not true NER. It will occasionally
  mis-fire on unusually formatted resumes (e.g., a name split across two
  lines, or a resume that opens with a tagline instead of a name).
- **Section detection depends on recognizable headers.** Resumes with
  unconventional or missing section titles (e.g., no explicit "Education"
  heading) will fall back to weaker whole-document heuristics for
  education, and will return an empty experience list if no "Experience"-
  like header is found at all.
- **Skills are dictionary-bound.** The list is broad (~150 terms across
  programming languages, web/cloud/data/ML tooling, and soft skills) but
  necessarily finite — it won't recognize every possible tool, framework,
  or niche skill on its own, though the Skills-section free-text fallback
  helps catch some of the gaps.
- **Phone number matching** is format-flexible but can occasionally match
  non-phone numeric sequences (e.g., a long ID number) if they happen to
  fall in a plausible digit-count range; it prefers numbers with a `+`
  country-code prefix when multiple candidates exist.
- **Experience parsing produces a role/detail structure**, not fully
  normalized fields (company, title, start date, end date, are not split
  out separately) — this was a deliberate scope call to keep the
  rule-based logic robust across varied resume layouts rather than brittle
  against one specific format.
- Legacy **`.doc`** (pre-2007 binary Word format) is explicitly rejected
  with a clear error; only `.docx` and `.pdf` are supported, per the
  assignment's mandatory formats.
