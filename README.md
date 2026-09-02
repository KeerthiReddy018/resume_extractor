# Resume Information Extraction System

A web application that accepts PDF and DOCX resumes and extracts structured
candidate information (name, email, phone, skills, education, work
experience, LinkedIn, GitHub) into clean JSON — with a polished drag-and-drop
UI to upload resumes and browse the results.

**No external LLM or generative AI API is used anywhere in this system.**
Extraction is 100% rule-based: regex pattern matching, resume-section
detection, and a curated skills dictionary. Resume content never leaves
the machine the app is running on.

---

## 1. What it does

| Field | Type | How it's found |
|---|---|---|
| Full Name | mandatory | Positional heuristic on the first lines of the resume, with an email-based fallback |
| Email | mandatory | Regex |
| Phone Number | mandatory | Regex (handles `+91 98765 43210`, `(022) 456-7890`, etc.) |
| Skills | mandatory | Matched against a 150+ term technical/professional skills dictionary, plus free-text tokens pulled from a detected "Skills" section |
| Education | bonus | Section detection + degree-keyword matching (B.Tech, MBA, M.Sc, etc.) with institution & year |
| Work Experience | bonus | Section detection + heading/bullet heuristics, grouped into role blocks with detail bullets |
| LinkedIn Profile | bonus | Regex on `linkedin.com/...` |
| GitHub Profile | bonus | Regex on `github.com/...` |

## 2. Project structure

```
resume_extractor/
├── app.py                 Flask server (routes + file upload handling)
├── extractor.py            Core extraction engine (all the parsing logic)
├── requirements.txt
├── templates/
│   ├── landing.html         Landing page ("/")
│   └── extract.html         Extraction tool page ("/extract")
├── static/
│   ├── landing.css          Landing page styling
│   ├── style.css            Extraction page styling
│   └── script.js            Extraction page behaviour (upload, render results, download JSON)
├── sample_resumes/          3 sample resumes used for testing (2 .docx, 1 .pdf)
├── sample_outputs/          The JSON produced for each sample resume
└── NOTES.md                 Approach, assumptions & limitations
```

## 3. Setup

Requires Python 3.9+.

```bash
cd resume_extractor
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Running it

```bash
python3 app.py
```

Then open **http://localhost:5000** in your browser.

- `/` — a minimal landing page introducing the tool. Click **Get started**.
- `/extract` — the extraction tool itself.

On the extraction page:
- Drag and drop (or click to browse) one or more `.pdf`/`.docx` resumes.
- Click **Extract information**.
- Browse results per-file as formatted cards, or flip to the **JSON** tab
  for the raw structured output.
- Click **Download all results (JSON)** to save everything to one file.

## 5. Using it without the UI (CLI / scripting)

The extraction engine is a plain Python module with no Flask dependency,
so it can be called directly:

```bash
python3 extractor.py sample_resumes/priya_sharma_resume.docx
```

or imported:

```python
from extractor import parse_resume

with open("resume.pdf", "rb") as f:
    data = parse_resume("resume.pdf", f.read())

print(data["name"], data["email"], data["skills"])
```

## 6. API

`POST /api/extract` — multipart form upload, field name `files` (accepts
multiple). Returns:

```json
{
  "results": [
    { "filename": "resume.pdf", "success": true, "data": { ... } },
    { "filename": "bad.docx", "success": false, "error": "..." }
  ]
}
```

`POST /api/download` — accepts a JSON body and returns it as a downloadable
`.json` file attachment (used by the "Download all" button).

`GET /api/health` — liveness check.

## 7. Sample resumes & outputs

`sample_resumes/` contains three synthetic test resumes covering different
formats and roles:
- `priya_sharma_resume.docx` — software engineer
- `rohan_mehta_resume.docx` — data scientist
- `arjun_verma_resume.pdf` — backend/DevOps engineer

Their corresponding extracted JSON is in `sample_outputs/`.

See `NOTES.md` for the approach, assumptions, and known limitations.
