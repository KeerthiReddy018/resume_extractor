(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileListEl = document.getElementById("fileList");
  const extractBtn = document.getElementById("extractBtn");
  const statusLine = document.getElementById("statusLine");

  const resultsEmpty = document.getElementById("resultsEmpty");
  const resultsTabs = document.getElementById("resultsTabs");
  const resultsBody = document.getElementById("resultsBody");
  const viewToggle = document.getElementById("viewToggle");
  const downloadAllBtn = document.getElementById("downloadAllBtn");

  let selectedFiles = [];
  let lastResults = [];
  let activeIndex = 0;
  let currentView = "cards";

  const ICONS = {
    mail: '<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 6l6.5 5 6.5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 20 20" fill="none"><path d="M5 3h2.2l1 3.6-1.7 1.4a10 10 0 0 0 5.5 5.5l1.4-1.7 3.6 1v2.2c0 1-.8 1.8-1.8 1.7C9.7 16.3 3.7 10.3 3.3 5.8 3.2 4.8 4 4 5 4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    linkedin: '<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M6.7 8.3v5.3M6.7 6.2v.02M9.6 13.6V8.3m0 0c0-1 .8-1.6 1.7-1.6 1 0 1.9.6 1.9 2.1v4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    github: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 2a8 8 0 0 0-2.5 15.6c.4.1.55-.2.55-.4v-1.4c-2.24.5-2.7-1-2.7-1-.37-.9-.9-1.2-.9-1.2-.73-.5.06-.5.06-.5.8.06 1.23.85 1.23.85.72 1.2 1.87.87 2.33.67.07-.5.28-.87.5-1.07-1.78-.2-3.65-.9-3.65-4a3.1 3.1 0 0 1 .83-2.15c-.08-.2-.36-1.02.08-2.13 0 0 .67-.2 2.2.83a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.83 2.2-.83.44 1.1.16 1.93.08 2.13a3.1 3.1 0 0 1 .83 2.15c0 3.1-1.88 3.8-3.67 4 .29.25.55.75.55 1.5v2.2c0 .2.15.5.55.4A8 8 0 0 0 10 2Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3 2 17h16L10 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 8.5v3.2M10 14.2v.02" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  // ---------------------------------------------------------------- //
  // File selection
  // ---------------------------------------------------------------- //
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    addFiles(Array.from(e.dataTransfer.files));
  });

  fileInput.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  function addFiles(files) {
    const valid = files.filter((f) => /\.(pdf|docx)$/i.test(f.name));
    if (valid.length < files.length) {
      setStatus("Some files were skipped — only .pdf and .docx are supported.", "error");
    }
    selectedFiles = selectedFiles.concat(valid).slice(0, 10);
    renderFileList();
  }

  function renderFileList() {
    fileListEl.innerHTML = "";
    selectedFiles.forEach((f, idx) => {
      const ext = f.name.split(".").pop().toUpperCase();
      const li = document.createElement("li");
      li.className = "file-list__item";
      li.innerHTML = `
        <span class="file-list__badge">${ext}</span>
        <span class="file-list__name">${escapeHtml(f.name)}</span>
        <button class="file-list__remove" data-idx="${idx}" title="Remove" aria-label="Remove ${escapeHtml(f.name)}">&times;</button>
      `;
      fileListEl.appendChild(li);
    });
    fileListEl.querySelectorAll(".file-list__remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedFiles.splice(Number(btn.dataset.idx), 1);
        renderFileList();
      });
    });
    extractBtn.disabled = selectedFiles.length === 0;
  }

  // ---------------------------------------------------------------- //
  // Extraction
  // ---------------------------------------------------------------- //
  extractBtn.addEventListener("click", async () => {
    if (selectedFiles.length === 0) return;

    extractBtn.disabled = true;
    extractBtn.classList.add("is-loading");
    setStatus(`Extracting ${selectedFiles.length} file(s)…`);

    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append("files", f));

    try {
      const resp = await fetch("/api/extract", { method: "POST", body: formData });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error(payload.error || "Extraction failed.");
      }
      lastResults = payload.results;
      activeIndex = 0;
      const okCount = lastResults.filter((r) => r.success).length;
      setStatus(`Done — extracted ${okCount} of ${lastResults.length} file(s).`, "success");
      renderResults();
    } catch (err) {
      setStatus(err.message || "Something went wrong.", "error");
    } finally {
      extractBtn.disabled = selectedFiles.length === 0;
      extractBtn.classList.remove("is-loading");
    }
  });

  function setStatus(msg, kind) {
    statusLine.textContent = msg;
    statusLine.classList.toggle("is-error", kind === "error");
    statusLine.classList.toggle("is-success", kind === "success");
  }

  // ---------------------------------------------------------------- //
  // Rendering
  // ---------------------------------------------------------------- //
  function renderResults() {
    if (!lastResults.length) {
      resultsEmpty.hidden = false;
      resultsTabs.hidden = true;
      viewToggle.hidden = true;
      downloadAllBtn.hidden = true;
      resultsBody.innerHTML = "";
      return;
    }

    resultsEmpty.hidden = true;
    viewToggle.hidden = false;
    downloadAllBtn.hidden = false;

    resultsTabs.hidden = lastResults.length <= 1;
    resultsTabs.innerHTML = "";
    lastResults.forEach((r, idx) => {
      const tab = document.createElement("button");
      tab.className = "results-tab" + (idx === activeIndex ? " is-active" : "") + (!r.success ? " is-error" : "");
      tab.textContent = r.filename;
      tab.addEventListener("click", () => {
        activeIndex = idx;
        renderResults();
      });
      resultsTabs.appendChild(tab);
    });

    resultsBody.setAttribute("data-view", currentView);
    resultsBody.innerHTML = "";

    const active = lastResults[activeIndex];
    if (!active.success) {
      resultsBody.innerHTML = `
        <div class="error-card">
          ${ICONS.warn}
          <div>
            <strong>Couldn't extract ${escapeHtml(active.filename)}</strong>
            ${escapeHtml(active.error)}
          </div>
        </div>`;
      return;
    }

    resultsBody.appendChild(buildCard(active.data));
    resultsBody.appendChild(buildJsonView(active.data));
  }

  function buildCard(data) {
    const card = document.createElement("div");
    card.className = "resume-card";

    const chips = [];
    chips.push(
      data.email
        ? `<a class="contact-chip" href="mailto:${escapeAttr(data.email)}">${ICONS.mail}${escapeHtml(data.email)}</a>`
        : `<span class="contact-chip is-missing">${ICONS.mail}no email found</span>`
    );
    chips.push(
      data.phone
        ? `<span class="contact-chip">${ICONS.phone}${escapeHtml(data.phone)}</span>`
        : `<span class="contact-chip is-missing">${ICONS.phone}no phone found</span>`
    );
    if (data.linkedin) chips.push(`<a class="contact-chip" href="${escapeAttr(data.linkedin)}" target="_blank" rel="noopener">${ICONS.linkedin}LinkedIn</a>`);
    if (data.github) chips.push(`<a class="contact-chip" href="${escapeAttr(data.github)}" target="_blank" rel="noopener">${ICONS.github}GitHub</a>`);

    let html = `
      <h3 class="resume-card__name">${escapeHtml(data.name || "Name not detected")}</h3>
      <div class="resume-card__contact">${chips.join("")}</div>
    `;

    // Skills
    html += `<div class="field-group"><p class="field-group__label">Skills</p>`;
    if (data.skills && data.skills.length) {
      html += `<div class="tag-row">${data.skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>`;
    } else {
      html += `<p class="muted-note">No skills matched.</p>`;
    }
    html += `</div>`;

    // Education
    html += `<div class="field-group"><p class="field-group__label">Education</p>`;
    if (data.education && data.education.length) {
      html += `<div class="timeline">` + data.education
        .map(
          (e) => `
        <div class="timeline-item">
          <div class="timeline-item__title">${escapeHtml(e.degree)}</div>
          <div class="timeline-item__meta">${[e.institution, e.year].filter(Boolean).map(escapeHtml).join(" &middot; ")}</div>
        </div>`
        )
        .join("") + `</div>`;
    } else {
      html += `<p class="muted-note">No education section detected.</p>`;
    }
    html += `</div>`;

    // Experience
    html += `<div class="field-group"><p class="field-group__label">Experience</p>`;
    if (data.experience && data.experience.length) {
      html += `<div class="timeline">` + data.experience
        .map((e) => {
          const details = (e.details || []).slice(0, 5).map((d) => `<li>${escapeHtml(d)}</li>`).join("");
          return `
        <div class="timeline-item">
          <div class="timeline-item__title">${escapeHtml(e.role_or_header || "Role")}</div>
          ${details ? `<ul class="timeline-item__details">${details}</ul>` : ""}
        </div>`;
        })
        .join("") + `</div>`;
    } else {
      html += `<p class="muted-note">No experience section detected.</p>`;
    }
    html += `</div>`;

    card.innerHTML = html;
    return card;
  }

  function buildJsonView(data) {
    const pre = document.createElement("pre");
    pre.className = "json-view";
    pre.innerHTML = highlightJson(JSON.stringify(data, null, 2));
    return pre;
  }

  function highlightJson(jsonStr) {
    const escaped = jsonStr
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          return /:$/.test(match)
            ? `<span class="json-key">${match}</span>`
            : `<span class="json-str">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
        if (/null/.test(match)) return `<span class="json-null">${match}</span>`;
        return `<span class="json-num">${match}</span>`;
      }
    );
  }

  viewToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-toggle__btn");
    if (!btn) return;
    currentView = btn.dataset.view;
    viewToggle.querySelectorAll(".view-toggle__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
    resultsBody.setAttribute("data-view", currentView);
  });

  downloadAllBtn.addEventListener("click", async () => {
    const resp = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastResults),
    });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted_resume_data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ---------------------------------------------------------------- //
  // Utils
  // ---------------------------------------------------------------- //
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }
})();
