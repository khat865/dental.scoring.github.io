const storageKey = "treatment-advice-review-notes-v1";

const state = {
  dataset: window.TREATMENT_ADVICE_REVIEW_DATA || { entries: [] },
  currentIndex: 0,
  notes: loadNotes(),
  saveTimer: null,
};

const elements = {
  currentIndex: document.getElementById("currentIndex"),
  totalCount: document.getElementById("totalCount"),
  completedCount: document.getElementById("completedCount"),
  completedTotal: document.getElementById("completedTotal"),
  progressFill: document.getElementById("progressFill"),
  caseImage: document.getElementById("caseImage"),
  questionText: document.getElementById("questionText"),
  answerText: document.getElementById("answerText"),
  datasetChip: document.getElementById("datasetChip"),
  categoryChip: document.getElementById("categoryChip"),
  draftChip: document.getElementById("draftChip"),
  caseId: document.getElementById("caseId"),
  doctorAdvice: document.getElementById("doctorAdvice"),
  saveState: document.getElementById("saveState"),
  charCount: document.getElementById("charCount"),
  sampleList: document.getElementById("sampleList"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  downloadCsvBtn: document.getElementById("downloadCsvBtn"),
  clearCurrentBtn: document.getElementById("clearCurrentBtn"),
  openImageBtn: document.getElementById("openImageBtn"),
};

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch (error) {
    console.warn("Failed to load saved notes:", error);
    return {};
  }
}

function persistNotes() {
  localStorage.setItem(storageKey, JSON.stringify(state.notes));
}

function getCaseId(entry) {
  return entry.id;
}

function currentEntry() {
  return state.dataset.entries[state.currentIndex];
}

function entryNote(entry) {
  return state.notes[getCaseId(entry)] || { advice: "", updated_at: "" };
}

function updateCounts() {
  const total = state.dataset.entries.length;
  const completed = state.dataset.entries.filter((entry) => {
    const advice = entryNote(entry).advice.trim();
    return advice.length > 0;
  }).length;

  elements.totalCount.textContent = total;
  elements.completedTotal.textContent = total;
  elements.completedCount.textContent = completed;
  elements.progressFill.style.width = total ? `${(completed / total) * 100}%` : "0%";
}

function updateNavigator() {
  elements.sampleList.innerHTML = "";
  state.dataset.entries.forEach((entry, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample-dot";
    button.textContent = entry.sample_index;

    if (index === state.currentIndex) {
      button.classList.add("active");
    }
    if (entryNote(entry).advice.trim()) {
      button.classList.add("completed");
    }

    button.addEventListener("click", () => {
      saveCurrentDraft();
      state.currentIndex = index;
      render();
    });
    elements.sampleList.appendChild(button);
  });
}

function render() {
  const entry = currentEntry();
  if (!entry) {
    return;
  }

  elements.currentIndex.textContent = entry.sample_index;
  elements.caseImage.src = entry.image;
  elements.caseImage.alt = `Sample ${entry.sample_index}`;
  elements.questionText.textContent = entry.question;
  elements.answerText.textContent = entry.answer;
  elements.datasetChip.textContent = `Dataset ${entry.source_dataset}`;
  elements.categoryChip.textContent = entry.condition_category.replaceAll("_", " ");
  elements.draftChip.textContent = entry.redrafted ? "Redrafted answer" : "Original answer";
  elements.caseId.textContent = entry.id;

  const note = entryNote(entry);
  elements.doctorAdvice.value = note.advice;
  elements.charCount.textContent = `${note.advice.length} characters`;
  elements.saveState.textContent = note.updated_at
    ? `Saved ${new Date(note.updated_at).toLocaleString()}`
    : "Not saved yet";

  elements.prevBtn.disabled = state.currentIndex === 0;
  elements.nextBtn.disabled = state.currentIndex === state.dataset.entries.length - 1;

  updateCounts();
  updateNavigator();
}

function saveCurrentDraft() {
  const entry = currentEntry();
  if (!entry) {
    return;
  }

  const advice = elements.doctorAdvice.value;
  state.notes[getCaseId(entry)] = {
    advice,
    updated_at: new Date().toISOString(),
  };
  persistNotes();
  elements.charCount.textContent = `${advice.length} characters`;
  elements.saveState.textContent = `Saved ${new Date().toLocaleString()}`;
  updateCounts();
  updateNavigator();
}

function scheduleSave() {
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(saveCurrentDraft, 250);
}

function clearCurrentNote() {
  elements.doctorAdvice.value = "";
  saveCurrentDraft();
}

function navigate(direction) {
  const target = state.currentIndex + direction;
  if (target < 0 || target >= state.dataset.entries.length) {
    return;
  }
  saveCurrentDraft();
  state.currentIndex = target;
  render();
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function downloadCsv() {
  saveCurrentDraft();
  const headers = [
    "sample_index",
    "id",
    "source_record_id",
    "source_dataset",
    "condition_category",
    "redrafted",
    "image",
    "question",
    "current_answer",
    "original_answer",
    "doctor_advice",
    "last_updated",
  ];

  const lines = [headers.join(",")];
  state.dataset.entries.forEach((entry) => {
    const note = entryNote(entry);
    const row = [
      entry.sample_index,
      entry.id,
      entry.source_record_id,
      entry.source_dataset,
      entry.condition_category,
      entry.redrafted ? "yes" : "no",
      entry.image,
      entry.question,
      entry.answer,
      entry.original_answer,
      note.advice,
      note.updated_at,
    ].map(escapeCsv);

    lines.push(row.join(","));
  });

  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "treatment_advice_review_results.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openImageInNewTab() {
  const entry = currentEntry();
  if (!entry) {
    return;
  }
  window.open(entry.image, "_blank", "noopener,noreferrer");
}

function setupEvents() {
  elements.doctorAdvice.addEventListener("input", () => {
    elements.charCount.textContent = `${elements.doctorAdvice.value.length} characters`;
    elements.saveState.textContent = "Saving...";
    scheduleSave();
  });

  elements.prevBtn.addEventListener("click", () => navigate(-1));
  elements.nextBtn.addEventListener("click", () => navigate(1));
  elements.downloadCsvBtn.addEventListener("click", downloadCsv);
  elements.clearCurrentBtn.addEventListener("click", clearCurrentNote);
  elements.openImageBtn.addEventListener("click", openImageInNewTab);

  window.addEventListener("beforeunload", saveCurrentDraft);
  window.addEventListener("keydown", (event) => {
    if (event.target === elements.doctorAdvice) {
      return;
    }
    if (event.key === "ArrowLeft") {
      navigate(-1);
    }
    if (event.key === "ArrowRight") {
      navigate(1);
    }
  });
}

function init() {
  if (!state.dataset.entries.length) {
    elements.questionText.textContent = "No review samples were loaded.";
    return;
  }
  setupEvents();
  render();
}

init();
