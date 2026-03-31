let quill;
let personalNotesQuill;
let currentClientId = null;
let currentNoteId = null;
let currentNoteType = "session";
let currentClientDetails = null;
let allClients = [];
let isNoteDirty = false;
let isNewNote = false;
let isLoadingNote = false;
let lastClientFilter = "active";
let isPersonalNotesExpanded = false;
let isCalendarMode = false;
let calendarView = "week";
let calendarFocusDate = new Date();
let calendarEvents = [];
const NOTE_SORT_STORAGE_KEY = "solu-notes-note-sort-order";
let currentNoteSortOrder = "latest";
const CALENDAR_WEEK_SLOT_HEIGHT = 56;
let selectedCalendarOccurrence = null;
const TODAY_SESSIONS_STORAGE_KEY = "solu-notes-today-sessions-panel-state";
const TODAY_SESSIONS_REFRESH_MS = 60 * 1000;
let todaySessionsState = null;
let todaySessionsData = [];
let todaySessionsTimerId = null;

function showError(message) {
  console.error(message);
  alert(message);
}

function normalizeNoteSortOrder(value) {
  return value === "oldest" ? "oldest" : "latest";
}

function loadNoteSortOrder() {
  try {
    return normalizeNoteSortOrder(localStorage.getItem(NOTE_SORT_STORAGE_KEY));
  } catch (_error) {
    return "latest";
  }
}

function persistNoteSortOrder(value) {
  try {
    localStorage.setItem(NOTE_SORT_STORAGE_KEY, normalizeNoteSortOrder(value));
  } catch (_error) {
    // Ignore storage write failures.
  }
}

function getNoteDateValue(note, type) {
  const dateField = type === "assessment"
    ? "assessment_date"
    : type === "supervision"
      ? "supervision_date"
      : type === "cpd"
        ? "cpd_date"
        : "session_date";
  return note?.[dateField] || "";
}

function compareNotesByOrder(a, b, order = currentNoteSortOrder) {
  const aDate = getNoteDateValue(a.note, a.type);
  const bDate = getNoteDateValue(b.note, b.type);
  if (aDate !== bDate) {
    return order === "oldest" ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
  }

  const aId = Number(a.note?.id || 0);
  const bId = Number(b.note?.id || 0);
  if (aId !== bId) {
    return order === "oldest" ? aId - bId : bId - aId;
  }

  return 0;
}

function updateNoteSortControlVisibility() {
  const control = document.getElementById("note-sort-control");
  if (!control) return;
  const shouldShow = Boolean(currentClientId);
  control.classList.toggle("hidden", !shouldShow);
}

async function reloadCurrentNoteList() {
  if (!currentClientId) return;
  if (currentClientId === "cpd") {
    await loadCPDNotes();
    return;
  }
  if (currentClientId === "supervision") {
    await loadSupervisionNotes();
    return;
  }
  await loadNotes(currentClientId);
}

window.addEventListener("load", () => {
  document.addEventListener("solu-theme-changed", event => {
    refreshNoteCardIcons(event?.detail?.theme);
  });
  window.ThemeManager?.init();
  currentNoteSortOrder = loadNoteSortOrder();
  const addNoteButton = document.getElementById("add-note");
  addNoteButton.style.display = "none";
  const noteSortSelect = document.getElementById("note-sort-order");
  if (noteSortSelect) {
    noteSortSelect.value = currentNoteSortOrder;
    noteSortSelect.addEventListener("change", async (e) => {
      currentNoteSortOrder = normalizeNoteSortOrder(e.target.value);
      persistNoteSortOrder(currentNoteSortOrder);
      await reloadCurrentNoteList();
    });
  }
  updateNoteSortControlVisibility();
  document.getElementById("client-filter").addEventListener("change", async (e) => {
    const nextFilter = e.target.value;
    if (!(await confirmDiscardIfDirty())) {
      e.target.value = lastClientFilter;
      return;
    }
    lastClientFilter = nextFilter;
    clearSelectionAfterFilterChange();
    fetchClients(nextFilter);
    updateGlobalTimeTotals();
  });

  quill = new Quill("#editor", {
    theme: "snow",
    modules: { toolbar: "#editor-toolbar" }
  });
  personalNotesQuill = new Quill("#personal-notes-editor", {
    theme: "snow",
    modules: { toolbar: "#personal-notes-toolbar" }
  });

  quill.on("text-change", (_delta, _old, source) => {
    if (source !== "user") return;
    markNoteDirty();
  });
  personalNotesQuill.on("text-change", (_delta, _old, source) => {
    if (source !== "user") return;
    markNoteDirty();
  });
  
  // Enable spellcheck on Quill contenteditable elements.
  // Use setTimeout to ensure Quill has fully initialized.
  setTimeout(() => {
    applyQuillSpellcheck("#editor");
    applyQuillSpellcheck("#personal-notes-editor");
  }, 100);

  fetchClients("active");
  updateGlobalTimeTotals();

  document.getElementById("add-client").addEventListener("click", openClientPrompt);
  document.getElementById("supervision-nav-card")?.addEventListener("click", async () => {
    await selectSupervision();
  });
  document.getElementById("cpd-nav-card")?.addEventListener("click", async () => {
    await selectCPD();
  });
  addNoteButton.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!(await confirmDiscardIfDirty())) {
      return;
    }
    // If CPD/Supervision special sections are selected, create matching note directly.
    if (currentClientId === "cpd") {
      createNewNote("cpd");
    } else if (currentClientId === "supervision") {
      createNewNote("supervision");
    } else {
      // For clients, show the note type selection modal
      openNoteTypeModal();
    }
  });

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("cancel-note-type").addEventListener("click", closeNoteTypeModal);
  document.getElementById("create-session-note").addEventListener("click", () => createNewNote("session"));
  document.getElementById("create-assessment-note").addEventListener("click", () => createNewNote("assessment"));
  document.getElementById("create-supervision-note").addEventListener("click", () => createNewNote("supervision"));
  document.getElementById("create-cpd-note").addEventListener("click", () => createNewNote("cpd"));
  document.getElementById("delete-note").addEventListener("click", deleteNote);
  document.getElementById("invoice-note").addEventListener("click", generateInvoiceForCurrentNote);

  document.getElementById("client-info-form").addEventListener("submit", submitClientEdit);
  document.getElementById("note-form").addEventListener("submit", submitNoteUpdate);
  const noteForm = document.getElementById("note-form");
  noteForm.addEventListener("input", () => markNoteDirty());
  noteForm.addEventListener("change", () => markNoteDirty());
  document.getElementById("note-link").addEventListener("input", (e) => {
    updateCpdLinkAnchor(e.target.value);
  });
  document.getElementById("supervision-summary").addEventListener("input", (e) => {
    updateSupervisionSummaryCounter(e.target.value);
  });
  document.getElementById("toggle-personal-notes").addEventListener("click", () => {
    setPersonalNotesExpanded(!isPersonalNotesExpanded);
  });
  document.getElementById("therapist-details-cancel")?.addEventListener("click", closeTherapistDetailsModal);
  document.getElementById("therapist-details-form")?.addEventListener("submit", submitTherapistDetails);

  document.getElementById("client-search").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    // Filter only clients (CPD is excluded from search and always appears at bottom)
    const filtered = allClients.filter(c =>
      c.full_name.toLowerCase().includes(term)
    );
    renderClientList(filtered);
  });

  document.getElementById("toggle-archive-btn")?.addEventListener("click", toggleArchiveStatus);
  document.getElementById("delete-client-btn").addEventListener("click", deleteClient);
  initializeCalendarUI();
  initializeTodaySessionsPanel();
  setPersonalNotesExpanded(false);
});

function setPersonalNotesExpanded(expanded) {
  isPersonalNotesExpanded = expanded;
  const toggleButton = document.getElementById("toggle-personal-notes");
  const content = document.getElementById("personal-notes-content");
  if (!toggleButton || !content) return;
  toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
  toggleButton.textContent = expanded ? "Personal Notes - Hide" : "Personal Notes - Show";
  content.classList.toggle("is-collapsed", !expanded);
}

function applyQuillSpellcheck(containerSelector) {
  const editorElement = document.querySelector(`${containerSelector} .ql-editor`);
  if (editorElement) {
    editorElement.setAttribute("spellcheck", "true");
  }
}

function setQuillContent(editor, value) {
  if (!editor) return;
  const content = value || "";
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(content);
  if (looksLikeHtml) {
    editor.setText("");
    editor.clipboard.dangerouslyPasteHTML(0, content);
  } else {
    editor.setText(content);
  }
}

function getQuillHtml(editor) {
  if (!editor) return "";
  const plain = editor.getText().trim();
  if (!plain) return "";
  return editor.root.innerHTML || "";
}

function normalizeUrlForNavigation(rawUrl) {
  const value = (rawUrl || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function updateCpdLinkAnchor(rawUrl) {
  const anchor = document.getElementById("note-link-anchor");
  if (!anchor) return;
  const normalizedUrl = normalizeUrlForNavigation(rawUrl);
  if (!normalizedUrl) {
    anchor.style.display = "none";
    anchor.textContent = "";
    anchor.href = "#";
    return;
  }
  anchor.href = normalizedUrl;
  anchor.textContent = normalizedUrl;
  anchor.style.display = "inline";
}

function updateSupervisionSummaryCounter(value) {
  const counter = document.getElementById("supervision-summary-counter");
  if (!counter) return;
  const currentLength = (value || "").length;
  counter.textContent = `${currentLength}/100`;
}

function resolveClientTherapyModality(clientId) {
  const normalizedClientId = Number(clientId);
  if (!Number.isFinite(normalizedClientId)) return "";
  const client = allClients.find(c => Number(c.id) === normalizedClientId);
  return (client?.therapy_modality || "").trim();
}

async function fetchClients(filter = "active") {
  const res = await fetch(`/api/clients/?filter=${filter}`);
  allClients = await res.json();
  renderClientList(allClients);
}

function clearClientSelectionUI() {
  document.querySelectorAll(".client-selection-item").forEach(el => el.classList.remove("selected"));
}

function syncSpecialSectionVisibility() {
  const specialSections = document.getElementById("client-pane-special-sections");
  if (!specialSections) return;
  const currentFilter = document.getElementById("client-filter")?.value || "active";
  specialSections.classList.toggle("hidden", !["active", "all"].includes(currentFilter));
}

function syncClientPaneSelection() {
  clearClientSelectionUI();
  if (currentClientId == null) return;
  const selectedItem = document.querySelector(`.client-selection-item[data-id="${currentClientId}"]`);
  if (selectedItem) selectedItem.classList.add("selected");
}

function renderClientList(clients) {
  const list = document.getElementById("client-list");
  list.innerHTML = "";

  clients.forEach(client => {
    const li = document.createElement("li");
    li.dataset.id = client.id;
    li.classList.add("client-selection-item");

    li.addEventListener("click", async () => {
      await selectClient(client.id, client.full_name);
    });

    const nameSpan = document.createElement("span");
    nameSpan.textContent = client.client_code || client.full_name;

    const infoBtn = document.createElement("button");
    infoBtn.textContent = "Info";
    infoBtn.classList.add("info-button");
    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(client.id);
    });

    li.appendChild(nameSpan);
    li.appendChild(infoBtn);
    list.appendChild(li);
  });
  syncSpecialSectionVisibility();
  syncClientPaneSelection();
}

function clearEditorPane() {
  setLoadingNote(true);
  // Hide the form
  const form = document.getElementById("note-form");
  form.hidden = true;
  form.dataset.noteType = "";
  
  // Reset note title
  document.getElementById("note-title").textContent = "Select a note";
  const modalityLabel = document.getElementById("note-therapy-modality");
  if (modalityLabel) {
    modalityLabel.textContent = "";
    modalityLabel.style.display = "none";
  }
  
  // Clear Quill editor content
  if (quill) {
    quill.setText("");
  }
  
  // Reset form fields
  document.getElementById("note-date").value = "";
  document.getElementById("note-duration").value = "";
  document.getElementById("note-paid").checked = false;
  
  // Reset session type radio buttons
  const radioButtons = document.getElementsByName("note-session-type");
  for (let radio of radioButtons) {
    if (radio.value === "In-Person") {
      radio.checked = true;
    } else {
      radio.checked = false;
    }
  }
  
  // Reset visibility of form elements
  const sessionTypeContainer = document.querySelector('.form-grid:has([name="note-session-type"])');
  if (sessionTypeContainer) {
    sessionTypeContainer.style.display = "none";
  }
  const paidCheckboxLabel = document.querySelector('label.checkbox-label:has(#note-paid)');
  if (paidCheckboxLabel) {
    paidCheckboxLabel.style.display = "flex";
  }
  document.getElementById("client-duration-paid-wrap").style.display = "";
  document.getElementById("cpd-fields-top").style.display = "none";
  document.getElementById("cpd-fields-bottom").style.display = "none";
  document.getElementById("editor-label").style.display = "none";
  document.getElementById("note-organisation").value = "";
  document.getElementById("note-title-field").value = "";
  document.getElementById("note-duration-hours").value = "1";
  document.getElementById("note-medium").value = "Online";
  document.getElementById("note-link").value = "";
  updateCpdLinkAnchor("");
  document.getElementById("supervision-summary").value = "";
  document.getElementById("supervision-supervisor-details").value = "";
  updateSupervisionSummaryCounter("");
  const supervisionSummarySection = document.getElementById("supervision-summary-section");
  if (supervisionSummarySection) supervisionSummarySection.style.display = "none";
  const supervisionSupervisorDetailsSection = document.getElementById("supervision-supervisor-details-section");
  if (supervisionSupervisorDetailsSection) supervisionSupervisorDetailsSection.style.display = "none";
  if (personalNotesQuill) {
    personalNotesQuill.setText("");
  }
  const personalNotesSection = document.querySelector(".personal-notes-section");
  if (personalNotesSection) personalNotesSection.style.display = "flex";
  setPersonalNotesExpanded(false);
  document.getElementById("delete-note").style.display = "none";
  document.getElementById("invoice-note").style.display = "none";

  // Reset note tracking variables
  currentNoteId = null;
  currentNoteType = "session";
  resetNoteState();
  
  // Clear any selected note cards
  document.querySelectorAll('.note-card').forEach(card => {
    card.classList.remove('selected');
  });
  setLoadingNote(false);
}

function clearSelectionAfterFilterChange() {
  currentClientId = null;
  currentNoteId = null;
  currentNoteType = "session";
  document.getElementById("client-name-header").textContent = "Select a client";
  const addNoteButton = document.getElementById("add-note");
  addNoteButton.style.display = "none";
  addNoteButton.disabled = true;
  document.getElementById("client-totals-summary").style.display = "none";
  document.getElementById("cpd-totals-summary").style.display = "none";
  document.getElementById("supervision-totals-summary").style.display = "none";
  updateNoteSortControlVisibility();
  const noteList = document.getElementById("note-list");
  noteList.innerHTML = "";
  clearClientSelectionUI();
  clearEditorPane();
}

async function selectClient(id, name) {
  if (!(await confirmDiscardIfDirty())) {
    return;
  }
  currentClientId = id;
  document.getElementById("client-name-header").textContent = name;
  const addNoteButton = document.getElementById("add-note");
  addNoteButton.style.display = "inline-flex";
  addNoteButton.disabled = false;
  updateNoteSortControlVisibility();
  document.getElementById("client-totals-summary").style.display = "none";
  document.getElementById("cpd-totals-summary").style.display = "none";
  document.getElementById("supervision-totals-summary").style.display = "none";
  
  // Clear the editor pane when selecting a new client
  clearEditorPane();
  
  // Load notes for the new client
  loadNotes(id);

  syncClientPaneSelection();
}

async function selectCPD() {
  if (!(await confirmDiscardIfDirty())) {
    return;
  }
  currentClientId = "cpd";
  document.getElementById("client-name-header").textContent = "CPD";
  const addNoteButton = document.getElementById("add-note");
  addNoteButton.style.display = "inline-flex";
  addNoteButton.disabled = false;
  updateNoteSortControlVisibility();
  document.getElementById("client-totals-summary").style.display = "none";
  document.getElementById("cpd-totals-summary").style.display = "none";
  document.getElementById("supervision-totals-summary").style.display = "none";
  
  // Clear the editor pane when selecting CPD
  clearEditorPane();
  
  // Load CPD notes
  loadCPDNotes();

  syncClientPaneSelection();
}

async function selectSupervision() {
  if (!(await confirmDiscardIfDirty())) {
    return;
  }
  currentClientId = "supervision";
  document.getElementById("client-name-header").textContent = "Supervision";
  const addNoteButton = document.getElementById("add-note");
  addNoteButton.style.display = "inline-flex";
  addNoteButton.disabled = false;
  updateNoteSortControlVisibility();
  document.getElementById("client-totals-summary").style.display = "none";
  document.getElementById("cpd-totals-summary").style.display = "none";
  document.getElementById("supervision-totals-summary").style.display = "none";

  clearEditorPane();
  loadSupervisionNotes();

  syncClientPaneSelection();
}

async function fetchNotesForClient(clientId) {
  const list = document.getElementById("note-list");
  list.innerHTML = "";

  const [sessionsRes, assessmentsRes] = await Promise.all([
    fetch(`/api/sessions/client/${clientId}`),
    fetch(`/api/assessments/client/${clientId}`)
  ]);

  const [sessions, assessments] = await Promise.all([
    sessionsRes.json(),
    assessmentsRes.json()
  ]);

  const combinedNotes = [
    ...assessments.map(note => ({ type: "assessment", note })),
    ...sessions.map(note => ({ type: "session", note }))
  ].sort((a, b) => compareNotesByOrder(a, b));

  combinedNotes.forEach(({ type, note }) => {
    const card = document.createElement("div");
    card.className = `note-card note-${type}`;
    card.dataset.noteId = note.id;
    card.dataset.noteType = type;

    const fallbackSessionType = type === "assessment" ? "Online" : "In-Person";
    const resolvedSessionType = note.session_type || fallbackSessionType;
    const noteDate = type === "assessment" ? note.assessment_date : note.session_date;
    const cardBody = createNoteCardBody({
      primary: resolveClientCardLabel(note.client_id ?? currentClientId),
      date: formatDate(noteDate),
      duration: `${note.duration_minutes ?? 0} min`,
      secondary: type.toUpperCase(),
      secondaryClass: "note-card-line2-label"
    });

    card.appendChild(createNoteCardIcon(type));
    card.appendChild(cardBody);
    card.appendChild(createNoteCardActions({
      badgeText: resolvedSessionType,
      badgeClassSuffix: resolvedSessionType.toLowerCase().replace(/ /g, '-'),
      isPaid: Boolean(note.is_paid)
    }));
    card.addEventListener("click", async () => {
      if (await confirmDiscardIfDirty()) {
        loadNote(type, note);
      }
    });
    list.appendChild(card);
  });
  
  return combinedNotes.map(item => item.note);
}

async function loadNote(type, note, options = {}) {
  if (isCalendarMode) {
    // Selecting a note should always return Pane 3 to note mode.
    setCalendarMode(false);
  }

  // Remove selection from all notes
  document.querySelectorAll('.note-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Add selection to the clicked note
  const selectedCard = document.querySelector(`.note-card[data-note-id="${note.id}"][data-note-type="${type}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }

  // Show the form
  const form = document.getElementById("note-form");
  form.hidden = false;
  form.dataset.noteType = type;

  setLoadingNote(true);
  currentNoteId = note.id;
  currentNoteType = type;
  resetNoteState({ isNew: Boolean(options.isNew) });
  
  const dateField = type === "assessment" ? "assessment_date" :
                   type === "supervision" ? "supervision_date" :
                   type === "cpd" ? "cpd_date" : "session_date";
  
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const dateStr = note[dateField];
  const formattedDate = dateStr ? dateStr.split("-").reverse().join("-") : "";
  const typeLabel = type === "cpd" ? "CPD" : capitalize(type);
  document.getElementById("note-title").textContent = `${typeLabel} on ${formattedDate}`;
  const modalityLabel = document.getElementById("note-therapy-modality");
  if (modalityLabel) {
    if (["session", "assessment"].includes(type)) {
      const modalityText = resolveClientTherapyModality(note.client_id ?? currentClientId);
      if (modalityText) {
        modalityLabel.textContent = modalityText;
        modalityLabel.style.display = "inline";
      } else {
        modalityLabel.textContent = "";
        modalityLabel.style.display = "none";
      }
    } else {
      modalityLabel.textContent = "";
      modalityLabel.style.display = "none";
    }
  }
  document.getElementById("note-date").value = note[dateField];
  const clientDurationWrap = document.getElementById("client-duration-paid-wrap");
  const sessionTypeWrap = document.getElementById("session-type-wrap");
  const cpdFieldsTop = document.getElementById("cpd-fields-top");
  const cpdFieldsBottom = document.getElementById("cpd-fields-bottom");
  const editorLabel = document.getElementById("editor-label");
  const personalNotesSection = document.querySelector(".personal-notes-section");
  const supervisionSummarySection = document.getElementById("supervision-summary-section");
  const supervisionSupervisorDetailsSection = document.getElementById("supervision-supervisor-details-section");

  if (type === "cpd") {
    clientDurationWrap.style.display = "none";
    if (sessionTypeWrap) sessionTypeWrap.style.display = "none";
    cpdFieldsTop.style.display = "grid";
    cpdFieldsBottom.style.display = "block";
    editorLabel.style.display = "block";
    editorLabel.textContent = "Focus and Outcome";
    document.getElementById("note-organisation").value = note.organisation || "";
    document.getElementById("note-title-field").value = note.title || "";
    document.getElementById("note-duration-hours").value = note.duration_hours != null ? note.duration_hours : "1";
    document.getElementById("note-medium").value = note.medium || "Online";
    document.getElementById("note-link").value = note.link_url || "";
    updateCpdLinkAnchor(note.link_url || "");
    document.getElementById("supervision-summary").value = "";
    document.getElementById("supervision-supervisor-details").value = "";
    updateSupervisionSummaryCounter("");
    if (supervisionSummarySection) supervisionSummarySection.style.display = "none";
    if (supervisionSupervisorDetailsSection) supervisionSupervisorDetailsSection.style.display = "none";
    if (personalNotesSection) personalNotesSection.style.display = "none";
    document.getElementById("delete-note").style.display = "inline-flex";
  } else {
    clientDurationWrap.style.display = "";
    if (sessionTypeWrap) sessionTypeWrap.style.display = ["session", "assessment", "supervision"].includes(type) ? "block" : "none";
    cpdFieldsTop.style.display = "none";
    cpdFieldsBottom.style.display = "none";
    editorLabel.style.display = "none";
    document.getElementById("note-duration").value = note.duration_minutes || "";
    document.getElementById("note-paid").checked = note.is_paid || false;
    document.getElementById("note-link").value = "";
    updateCpdLinkAnchor("");
    const summaryValue = type === "supervision" ? (note.summary || "") : "";
    const supervisorDetailsValue = type === "supervision" ? (note.supervisor_details || "") : "";
    document.getElementById("supervision-summary").value = summaryValue;
    document.getElementById("supervision-supervisor-details").value = supervisorDetailsValue;
    updateSupervisionSummaryCounter(summaryValue);
    if (supervisionSummarySection) supervisionSummarySection.style.display = type === "supervision" ? "block" : "none";
    if (supervisionSupervisorDetailsSection) supervisionSupervisorDetailsSection.style.display = type === "supervision" ? "block" : "none";
    if (personalNotesSection) personalNotesSection.style.display = "flex";
    setPersonalNotesExpanded(isPersonalNotesExpanded);
    document.getElementById("delete-note").style.display = "inline-flex";
  }
  const invoiceButton = document.getElementById("invoice-note");
  if (invoiceButton) {
    invoiceButton.style.display = ["session", "assessment"].includes(type) ? "inline-flex" : "none";
  }
  if (["session", "assessment", "supervision"].includes(type)) {
    const radioButtons = document.getElementsByName("note-session-type");
    const currentSessionType = note.session_type || "Online";
    for (let radio of radioButtons) {
      if (radio.value === currentSessionType) {
        radio.checked = true;
        break;
      }
    }
  }
  // Show/hide session type radio buttons based on note type
  const sessionTypeContainer = document.querySelector('.form-grid:has([name="note-session-type"])');
  if (sessionTypeContainer) {
    sessionTypeContainer.style.display = ["session", "assessment", "supervision"].includes(type) ? "block" : "none";
  }
  // Show/hide paid checkbox based on note type (hide for CPD)
  const paidCheckboxLabel = document.querySelector('label.checkbox-label:has(#note-paid)');
  if (paidCheckboxLabel) {
    paidCheckboxLabel.style.display = type === "cpd" ? "none" : "flex";
  }
  // CPD required fields: ensure form validation doesn't block when hidden
  document.getElementById("note-organisation").required = type === "cpd";
  document.getElementById("note-title-field").required = type === "cpd";
  setQuillContent(quill, note.content || "");
  if (personalNotesQuill) {
    setQuillContent(personalNotesQuill, type === "cpd" ? "" : (note.personal_notes || ""));
  }
  setLoadingNote(false);
}

async function deleteNote() {
  if (!currentNoteId || !currentNoteType) {
    return;
  }
  const confirmed = confirm("Delete this note? This cannot be undone.");
  if (!confirmed) return;

  const deleted = await deleteNoteByType(currentNoteType, currentNoteId);
  if (!deleted) return;

  clearEditorPane();
}

async function generateInvoiceForCurrentNote() {
  if (!currentNoteId || !["session", "assessment"].includes(currentNoteType)) {
    return;
  }

  const endpoint = currentNoteType === "session"
    ? `/api/invoices/from-session/${currentNoteId}`
    : `/api/invoices/from-assessment/${currentNoteId}`;

  try {
    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showError(data.detail || "Failed to generate invoice.");
      return;
    }

    const pdfUrl = data.pdf_url || (data.id ? `/api/invoices/${data.id}/pdf` : null);
    if (!pdfUrl) {
      showError("Invoice was created, but PDF preview URL is unavailable.");
      return;
    }

    const previewUrlObj = new URL(pdfUrl, window.location.origin);
    previewUrlObj.searchParams.set("ts", String(Date.now()));
    const previewUrl = previewUrlObj.href;
    const isElectronRuntime = /Electron/i.test(navigator.userAgent || "");

    if (isElectronRuntime) {
      window.location.href = previewUrl;
      return;
    }

    const opened = window.open(previewUrl, "_blank");
    if (!opened) {
      // Fallback for popup-blocked browsers.
      window.location.href = previewUrl;
    }
  } catch (error) {
    console.error("Error generating invoice:", error);
    showError("Failed to generate invoice.");
  }
}

async function submitNoteUpdate(e) {
  e.preventDefault();
  const payload = {
    content: getQuillHtml(quill)
  };

  const urlMap = {
    session: `/api/sessions/${currentNoteId}`,
    assessment: `/api/assessments/${currentNoteId}`,
    supervision: `/api/supervisions/${currentNoteId}`,
    cpd: `/api/cpd/${currentNoteId}`
  };

  const dateField = currentNoteType === "assessment" ? "assessment_date" :
                    currentNoteType === "supervision" ? "supervision_date" :
                    currentNoteType === "cpd" ? "cpd_date" : "session_date";

  payload[dateField] = document.getElementById("note-date").value;

  if (currentNoteType === "cpd") {
    const durationHours = document.getElementById("note-duration-hours").value;
    payload.duration_hours = durationHours ? parseFloat(durationHours) : 1;
    payload.organisation = document.getElementById("note-organisation").value.trim() || "";
    payload.title = document.getElementById("note-title-field").value.trim() || "";
    payload.medium = document.getElementById("note-medium").value || "Online";
    payload.link_url = document.getElementById("note-link").value.trim();
  } else {
    payload.personal_notes = getQuillHtml(personalNotesQuill);
    const duration = document.getElementById("note-duration").value;
    if (duration) {
      payload.duration_minutes = parseInt(duration);
    }
    payload.is_paid = document.getElementById("note-paid").checked;
  }
  if (["session", "assessment", "supervision"].includes(currentNoteType)) {
    const selectedRadio = document.querySelector('input[name="note-session-type"]:checked');
    payload.session_type = selectedRadio ? selectedRadio.value : "Online";
    if (currentNoteType === "supervision") {
      payload.summary = document.getElementById("supervision-summary").value.slice(0, 100);
      payload.supervisor_details = document.getElementById("supervision-supervisor-details").value.trim();
    }
  }  

  const res = await fetch(urlMap[currentNoteType], {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  console.log("Save response:", res.status, data);
  
  if (res.status === 200) {
    document.getElementById("save-status").textContent = "Saved";
    setTimeout(() => document.getElementById("save-status").textContent = "", 2000);
    resetNoteState({ isNew: false });
    
    // Store the current note ID to re-select it after reload
    const noteIdToReselect = currentNoteId;
    const noteTypeToReselect = currentNoteType;
    
    // Reload notes based on whether it's CPD or a client
    if (currentClientId === "cpd") {
      await loadCPDNotes();
    } else if (currentClientId === "supervision") {
      await loadSupervisionNotes();
    } else {
      await loadNotes(currentClientId);
      await updateGlobalTimeTotals();
    }
    
    // Re-select the note that was being edited
    if (noteIdToReselect && noteTypeToReselect) {
      const cardToReselect = document.querySelector(`.note-card[data-note-id="${noteIdToReselect}"][data-note-type="${noteTypeToReselect}"]`);
      if (cardToReselect) {
        // Remove selection from all cards
        document.querySelectorAll('.note-card').forEach(card => {
          card.classList.remove('selected');
        });
        // Re-add selection to the saved note
        cardToReselect.classList.add('selected');
      }
    }
  }  
}

function openNoteTypeModal() {
  // Show appropriate buttons based on whether CPD or client is selected
  const clientNoteButtons = document.getElementById("client-note-buttons");
  const cpdNoteButtons = document.getElementById("cpd-note-buttons");
  const supervisionButton = document.getElementById("create-supervision-note");
  
  if (currentClientId === "cpd") {
    clientNoteButtons.style.display = "none";
    cpdNoteButtons.style.display = "flex";
    if (supervisionButton) supervisionButton.style.display = "none";
  } else {
    clientNoteButtons.style.display = "flex";
    cpdNoteButtons.style.display = "none";
    // Supervision notes are now managed only from the global Supervision section.
    if (supervisionButton) supervisionButton.style.display = "none";
  }
  
  document.getElementById("note-type-modal").classList.remove("hidden");
}

function closeNoteTypeModal() {
  document.getElementById("note-type-modal").classList.add("hidden");
}

async function createNewNote(type) {
  const today = new Date().toISOString().slice(0, 10);
  const supervisionClientId = currentClientId === "supervision"
    ? allClients.find(c => Number.isFinite(Number(c.id)))?.id
    : currentClientId;
  if (type === "supervision" && !supervisionClientId) {
    alert("Please create at least one client before adding Supervision notes.");
    return;
  }
  const payload = {
    content: "",
    ...(type === "session" && {
      client_id: currentClientId,
      session_date: today,
      duration_minutes: 50,
      is_paid: false,
      session_type: "In-Person",
      personal_notes: ""
    }),
    ...(type === "assessment" && {
      client_id: currentClientId,
      assessment_date: today,
      duration_minutes: 50,
      is_paid: false,
      session_type: "Online",
      personal_notes: ""
    }),
    ...(type === "supervision" && {
      client_id: supervisionClientId,
      supervision_date: today,
      session_type: "Online",
      personal_notes: "",
      summary: "",
      supervisor_details: ""
    }),
    ...(type === "cpd" && {
      cpd_date: today,
      duration_hours: 1,
      organisation: "",
      title: "",
      medium: "Online",
      link_url: ""
    })
  };

  const urlMap = {
    session: "/api/sessions/",
    assessment: "/api/assessments/",
    supervision: "/api/supervisions/",
    cpd: "/api/cpd/"
  };

  const res = await fetch(urlMap[type], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    let newNote = null;
    try {
      newNote = await res.json();
    } catch (error) {
      console.warn("Create note: no JSON body returned", error);
    }
    closeNoteTypeModal();

    // Reload notes based on whether it's CPD or a client
    if (currentClientId === "cpd") {
      const cpdNotes = await loadCPDNotes();
      if (!newNote && Array.isArray(cpdNotes) && cpdNotes.length > 0) {
        newNote = cpdNotes[cpdNotes.length - 1];
      }
    } else if (currentClientId === "supervision") {
      const supervisionNotes = await loadSupervisionNotes();
      if (!newNote && Array.isArray(supervisionNotes) && supervisionNotes.length > 0) {
        newNote = supervisionNotes[supervisionNotes.length - 1];
      }
    } else {
      await loadNotes(currentClientId);
      await updateGlobalTimeTotals();
    }

    if (newNote) {
      loadNote(type, newNote, { isNew: true });
    }
  } else {
    const errText = await res.text();
    console.error("Create note failed:", res.status, errText);
    try {
      const errJson = JSON.parse(errText);
      const detail = errJson.detail || errText;
      alert("Failed to create note: " + (Array.isArray(detail) ? detail.map(d => d.msg || d).join("; ") : detail));
    } catch (_) {
      alert("Failed to create note (" + res.status + "). Check the console for details.");
    }
  }
}

function openClientPrompt() {
  currentClientId = null;  // Reset the current client ID
  const clientModal = document.getElementById("client-modal");
  clientModal.classList.remove("hidden");
  resetClientModalScroll();
  document.getElementById("client-info-form").reset();
  document.getElementById("modal-client-code").required = true;
  document.getElementById("modal-client-status").value = "active";
  document.getElementById("delete-client-btn").style.display = "none";
}

async function openEditModal(clientId) {
  document.getElementById("client-info-form").reset();
  currentClientId = clientId;

  try {
    const res = await fetch(`/api/clients/${clientId}`);
    if (!res.ok) {
      throw new Error(`Failed to load client: ${res.statusText}`);
    }
    const client = await res.json();

    document.getElementById("modal-first-name").value = client.first_name;
    document.getElementById("modal-last-name").value = client.last_name;
    document.getElementById("modal-email").value = client.email || "";
    document.getElementById("modal-phone").value = client.phone || "";
    document.getElementById("modal-dob").value = client.date_of_birth || "";
    document.getElementById("modal-assessment-date").value = client.initial_assessment_date || "";
    document.getElementById("modal-client-code").value = client.client_code || "";
    document.getElementById("modal-session-hourly-rate").value = client.session_hourly_rate || "";
    document.getElementById("modal-therapy-modality").value = client.therapy_modality || "";
    document.getElementById("modal-client-status").value = client.status || "active";
    document.getElementById("modal-address1").value = client.address1 || "";
    document.getElementById("modal-address2").value = client.address2 || "";
    document.getElementById("modal-city").value = client.city || "";
    document.getElementById("modal-postcode").value = client.postcode || "";
    document.getElementById("modal-emergency-name").value = client.emergency_contact_name || "";
    document.getElementById("modal-emergency-relationship").value = client.emergency_contact_relationship || "";
    document.getElementById("modal-emergency-phone").value = client.emergency_contact_phone || "";
    document.getElementById("modal-gp-name").value = client.gp_name || "";
    document.getElementById("modal-gp-practice").value = client.gp_practice || "";
    document.getElementById("modal-gp-phone").value = client.gp_phone || "";

    document.getElementById("delete-client-btn").style.display = "block";

    document.getElementById("modal-client-code").required = false;
    document.getElementById("client-modal").classList.remove("hidden");
    resetClientModalScroll();
  } catch (error) {
    console.error("Error loading client details:", error);
    alert("Failed to load client details. Please try again.");
  }
}

async function submitClientEdit(e) {
  e.preventDefault();
  
  const clientCodeInput = document.getElementById("modal-client-code").value.trim();
  const sessionHourlyRateInput = document.getElementById("modal-session-hourly-rate").value.trim();
  const initialAssessmentDateInput = document.getElementById("modal-assessment-date").value.trim();
  if (!currentClientId && !clientCodeInput) {
    alert("Client Code is required for new clients.");
    return;
  }
  if (!sessionHourlyRateInput) {
    alert("Session/Hourly Rate is required.");
    return;
  }
  if (clientCodeInput && !/^[A-Za-z0-9_.-]+$/.test(clientCodeInput)) {
    alert("Client Code can only include letters, numbers, hyphen (-), underscore (_), and dot (.).");
    return;
  }

  const formData = {
    first_name: document.getElementById("modal-first-name").value,
    last_name: document.getElementById("modal-last-name").value,
    client_code: clientCodeInput || null,
    email: document.getElementById("modal-email").value,
    phone: document.getElementById("modal-phone").value,
    date_of_birth: document.getElementById("modal-dob").value,
    initial_assessment_date: initialAssessmentDateInput || null,
    session_hourly_rate: sessionHourlyRateInput,
    therapy_modality: document.getElementById("modal-therapy-modality").value || null,
    status: document.getElementById("modal-client-status").value || "active",
    address1: document.getElementById("modal-address1").value,
    address2: document.getElementById("modal-address2").value,
    city: document.getElementById("modal-city").value,
    postcode: document.getElementById("modal-postcode").value,
    emergency_contact_name: document.getElementById("modal-emergency-name").value,
    emergency_contact_relationship: document.getElementById("modal-emergency-relationship").value,
    emergency_contact_phone: document.getElementById("modal-emergency-phone").value,
    gp_name: document.getElementById("modal-gp-name").value,
    gp_practice: document.getElementById("modal-gp-practice").value,
    gp_phone: document.getElementById("modal-gp-phone").value
  };

  const url = currentClientId ? `/api/clients/${currentClientId}` : "/api/clients/";
  const method = currentClientId ? "PUT" : "POST";

  try {
    console.log(`Submitting client data to ${url} with method ${method}:`, formData);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Client save successful:", data);
      const selectedFilter = document.getElementById("client-filter").value;
      const existingClient = currentClientId ? allClients.find(c => c.id === currentClientId) : null;
      const statusChanged = Boolean(existingClient && existingClient.status !== data.status);
      closeModal();
      if (statusChanged && selectedFilter !== "all" && selectedFilter !== data.status) {
        clearSelectionAfterFilterChange();
      }
      await fetchClients(selectedFilter);
    } else {
      const errorData = await res.json();
      console.error("Failed to save client:", {
        status: res.status,
        statusText: res.statusText,
        error: errorData
      });
      alert(`Failed to save client information: ${errorData.detail || res.statusText}`);
    }
  } catch (error) {
    console.error("Error saving client:", error);
    alert("Error saving client information. Please check the console for details.");
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatNoteLabel(type, date, duration) {
  // Format: "Type - DD/MM/YYYY - (X min)" or for CPD "(X h)"
  const typeLabel = capitalize(type);
  const formattedDate = formatDate(date);
  const durationText = type === "cpd"
    ? (duration !== null && duration !== undefined ? `${duration} h` : "0 h")
    : (duration !== null && duration !== undefined ? `${duration} min` : "0 min");
  return `${typeLabel} - ${formattedDate} - (${durationText})`;
}

function formatCPDNoteLabel(note) {
  const formattedDate = formatDate(note.cpd_date);
  const durationText = note.duration_hours !== null && note.duration_hours !== undefined
    ? `${note.duration_hours} h`
    : "0 h";
  const title = (note.title || "").trim() || "Untitled";
  return {
    prefix: `${formattedDate} - ${durationText} - `,
    title
  };
}

function formatSupervisionNoteLabel(note) {
  const formattedDate = formatDate(note.supervision_date);
  const durationText = note.duration_minutes !== null && note.duration_minutes !== undefined
    ? `${note.duration_minutes} min`
    : "0 min";
  const summary = (note.summary || "").trim() || "No summary";
  return {
    meta: `${formattedDate} - ${durationText}`,
    summary
  };
}

const ASSET_VERSION_QUERY = window.__ASSET_VERSION__ ? `?v=${window.__ASSET_VERSION__}` : "";
const THEME_AWARE_ICON_MAP = {
  dark: {
    session: `/static/assets/Session_Icon.png${ASSET_VERSION_QUERY}`,
    assessment: `/static/assets/Assesment_Icon.png${ASSET_VERSION_QUERY}`,
    supervision: `/static/assets/Supervision_Icon.png${ASSET_VERSION_QUERY}`,
    cpd: `/static/assets/CPD_Icon.png${ASSET_VERSION_QUERY}`,
    calendar: `/static/assets/CALENDAR%20ICON.png${ASSET_VERSION_QUERY}`
  },
  light: {
    session: `/static/assets/Session_Icon_light.png${ASSET_VERSION_QUERY}`,
    assessment: `/static/assets/Assessment_Icon_light.png${ASSET_VERSION_QUERY}`,
    supervision: `/static/assets/Supervision_Icon_light.png${ASSET_VERSION_QUERY}`,
    cpd: `/static/assets/CPD_Icon_light.png${ASSET_VERSION_QUERY}`,
    calendar: `/static/assets/CALENDAR%20ICON.png${ASSET_VERSION_QUERY}`
  }
};

function getCurrentThemeName() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getThemeAwareIconSrc(type, theme = getCurrentThemeName()) {
  const themeMap = THEME_AWARE_ICON_MAP[theme] || THEME_AWARE_ICON_MAP.dark;
  return themeMap[type] || themeMap.session;
}

function resolveClientCardLabel(clientId = currentClientId) {
  const normalizedClientId = Number(clientId);
  if (!Number.isFinite(normalizedClientId)) return "Client";
  const client = allClients.find(c => Number(c.id) === normalizedClientId);
  return (client?.client_code || client?.full_name || "Client").trim();
}

function createNoteCardIcon(type) {
  const wrapper = document.createElement("div");
  wrapper.className = "note-card-icon-wrap";

  const icon = document.createElement("img");
  icon.className = "note-card-icon theme-aware-icon";
  icon.dataset.iconType = type;
  icon.src = getThemeAwareIconSrc(type);
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");

  wrapper.appendChild(icon);
  return wrapper;
}

function refreshNoteCardIcons(theme = getCurrentThemeName()) {
  document.querySelectorAll(".theme-aware-icon[data-icon-type]").forEach(icon => {
    const type = icon.dataset.iconType || "session";
    icon.src = getThemeAwareIconSrc(type, theme);
  });
}

function createNoteCardMetaRow(segments) {
  const row = document.createElement("div");
  row.className = "note-card-line1";

  segments.filter(Boolean).forEach((segment, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.className = "note-card-separator";
      separator.textContent = "•";
      row.appendChild(separator);
    }

    const span = document.createElement("span");
    span.className = index === 0 ? "note-card-line1-primary" : "note-card-line1-meta";
    span.textContent = segment;
    row.appendChild(span);
  });

  return row;
}

function createNoteCardBody({ primary, date, duration, secondary, secondaryClass = "" }) {
  const body = document.createElement("div");
  body.className = "note-card-body";

  body.appendChild(createNoteCardMetaRow([primary, date, duration]));

  const secondaryLine = document.createElement("div");
  secondaryLine.className = `note-card-line2 ${secondaryClass}`.trim();
  secondaryLine.textContent = secondary;
  body.appendChild(secondaryLine);

  return body;
}

function createNoteCardActions({ badgeText, badgeClassSuffix, isPaid = null }) {
  const actions = document.createElement("div");
  actions.className = "note-card-actions";

  if (badgeText) {
    const badge = document.createElement("span");
    badge.className = `session-type-badge ${badgeClassSuffix}`;
    badge.textContent = badgeText;
    actions.appendChild(badge);
  }

  if (isPaid !== null) {
    const paymentIndicator = document.createElement("div");
    paymentIndicator.className = `payment-indicator ${isPaid ? "paid" : "unpaid"}`;
    paymentIndicator.title = isPaid ? "Paid" : "Unpaid";
    actions.appendChild(paymentIndicator);
  }

  return actions;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatHours(hours) {
  if (hours == null || Number.isNaN(hours)) return "0h";
  const rounded = Math.round(hours * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, "");
  return `${text}h`;
}

function markNoteDirty() {
  if (isLoadingNote) return;
  if (!currentNoteId) return;
  if (!isNoteDirty) {
    isNoteDirty = true;
  }
}

function resetNoteState({ isNew = false } = {}) {
  isNoteDirty = false;
  isNewNote = isNew;
  const saveStatus = document.getElementById("save-status");
  if (saveStatus) {
    saveStatus.textContent = "";
  }
}

function setLoadingNote(value) {
  isLoadingNote = value;
}

async function confirmDiscardIfDirty() {
  if (!currentNoteId) return true;
  if (!isNoteDirty && !isNewNote) return true;
  const message = isNewNote
    ? "This new note hasn't been saved yet. Click OK to discard it, or Cancel to return and save."
    : "You have unsaved changes. Click OK to discard them, or Cancel to return and save.";
  const discard = confirm(message);
  if (!discard) return false;
  const discarded = await discardCurrentNote();
  return discarded;
}

async function discardCurrentNote() {
  if (!currentNoteId) return true;
  if (isNewNote) {
    const deleted = await deleteNoteByType(currentNoteType, currentNoteId, { actionLabel: "discard" });
    if (!deleted) return false;
  }
  resetNoteState({ isNew: false });
  return true;
}

async function deleteNoteByType(type, id, { actionLabel = "delete" } = {}) {
  const urlMap = {
    session: `/api/sessions/${id}`,
    assessment: `/api/assessments/${id}`,
    supervision: `/api/supervisions/${id}`,
    cpd: `/api/cpd/${id}`
  };
  const url = urlMap[type];
  if (!url) return false;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const errText = await res.text();
    showError(`Failed to ${actionLabel} ${type} note: ${res.status} ${errText}`);
    return false;
  }
  if (currentClientId === "cpd") {
    await loadCPDNotes();
  } else if (currentClientId === "supervision") {
    await loadSupervisionNotes();
  } else if (currentClientId) {
    await loadNotes(currentClientId);
    await updateGlobalTimeTotals();
  }
  return true;
}

async function updateGlobalTimeTotals() {
  try {
    // Use the current filter selection
    const currentFilter = document.getElementById("client-filter")?.value || "all";
    const res = await fetch(`/api/reports/totals?filter=${currentFilter}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch totals: ${res.statusText}`);
    }

    const data = await res.json();
    document.getElementById("session-total").textContent = formatTime(data.total_session_minutes || 0);
    document.getElementById("session-count").textContent = String(data.total_session_count || 0);
    document.getElementById("supervision-total").textContent = formatTime(data.total_supervision_minutes || 0);
    document.getElementById("supervision-count").textContent = String(data.total_supervision_count || 0);
  } catch (err) {
    console.error("Error loading time totals:", err);
    document.getElementById("session-total").textContent = "Error";
    document.getElementById("session-count").textContent = "Error";
    document.getElementById("supervision-total").textContent = "Error";
    document.getElementById("supervision-count").textContent = "Error";
  }
}

function setTherapistDetailsFormValues(details = {}) {
  document.getElementById("therapist-business-name").value = details.business_name || "";
  document.getElementById("therapist-name").value = details.therapist_name || "";
  document.getElementById("therapist-accreditation").value = details.accreditation || "";
  document.getElementById("therapist-street").value = details.street || "";
  document.getElementById("therapist-city").value = details.city || "";
  document.getElementById("therapist-postcode").value = details.postcode || "";
  document.getElementById("therapist-therapy-type").value = details.therapy_type || "";
  document.getElementById("therapist-website").value = details.website || "";
  document.getElementById("therapist-email").value = details.email || "";
  document.getElementById("therapist-bank").value = details.bank || "";
  document.getElementById("therapist-currency").value = details.currency || "GBP";
  document.getElementById("therapist-sort-code").value = details.sort_code || "";
  document.getElementById("therapist-account-number").value = details.account_number || "";
  document.getElementById("therapist-iban").value = details.iban || "";
  document.getElementById("therapist-bic").value = details.bic || "";
}

function normalizeTherapistWebsite(rawWebsite) {
  const website = (rawWebsite || "").trim();
  if (!website) return "";

  const normalized = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname) {
      return null;
    }
    return normalized;
  } catch (_error) {
    return null;
  }
}

function closeTherapistDetailsModal() {
  document.getElementById("therapist-details-modal")?.classList.add("hidden");
}

async function openTherapistDetailsModal() {
  const modal = document.getElementById("therapist-details-modal");
  if (!modal) return;

  try {
    const res = await fetch("/api/therapist-details/");
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || "Failed to load therapist details.");
    }
    const details = await res.json();
    setTherapistDetailsFormValues(details);
  } catch (error) {
    console.error("Error loading therapist details:", error);
    showError("Failed to load therapist details.");
    return;
  }

  modal.classList.remove("hidden");
}

async function submitTherapistDetails(event) {
  event.preventDefault();
  const websiteValue = normalizeTherapistWebsite(document.getElementById("therapist-website").value);
  if (websiteValue === null) {
    showError("Please enter a valid website (for example: www.mywebsite.com).");
    return;
  }

  const payload = {
    business_name: document.getElementById("therapist-business-name").value.trim(),
    therapist_name: document.getElementById("therapist-name").value.trim(),
    accreditation: document.getElementById("therapist-accreditation").value.trim(),
    street: document.getElementById("therapist-street").value.trim(),
    city: document.getElementById("therapist-city").value.trim(),
    postcode: document.getElementById("therapist-postcode").value.trim(),
    therapy_type: document.getElementById("therapist-therapy-type").value.trim(),
    website: websiteValue,
    email: document.getElementById("therapist-email").value.trim(),
    bank: document.getElementById("therapist-bank").value.trim(),
    currency: document.getElementById("therapist-currency").value.trim().toUpperCase(),
    sort_code: document.getElementById("therapist-sort-code").value.trim(),
    account_number: document.getElementById("therapist-account-number").value.trim(),
    iban: document.getElementById("therapist-iban").value.trim(),
    bic: document.getElementById("therapist-bic").value.trim()
  };

  const missingFields = [
    ["Business Name", payload.business_name],
    ["Therapist Name", payload.therapist_name],
    ["Therapy Type", payload.therapy_type],
    ["Email", payload.email],
    ["Bank", payload.bank],
    ["Sort Code", payload.sort_code],
    ["Account Number", payload.account_number]
  ].filter(([, value]) => !value);

  if (missingFields.length > 0) {
    showError(`Please complete required fields: ${missingFields.map(([label]) => label).join(", ")}`);
    return;
  }

  const res = await fetch("/api/therapist-details/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showError(data.detail || "Failed to save therapist details.");
    return;
  }

  setTherapistDetailsFormValues(data);
  closeTherapistDetailsModal();
}

window.openTherapistDetailsModal = openTherapistDetailsModal;

function closeModal() {
  document.getElementById("client-modal").classList.add("hidden");
  currentClientDetails = null;
}

function resetClientModalScroll() {
  const modal = document.getElementById("client-modal");
  if (!modal) return;
  const modalContent = modal.querySelector(".modal-content");
  modal.scrollTop = 0;
  if (modalContent) {
    modalContent.scrollTop = 0;
  }
  // Ensure top anchoring after layout settles.
  requestAnimationFrame(() => {
    modal.scrollTop = 0;
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  });
}

async function toggleArchiveStatus() {
  if (!currentClientId) return;
  
  const client = allClients.find(c => c.id === currentClientId);
  if (!client) return;

  const newStatus = client.status === "active";
  const action = newStatus ? "archive" : "unarchive";

  if (!confirm(`Are you sure you want to ${action} this client?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/clients/${currentClientId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: newStatus })
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Successfully ${action}ed client:`, data);
      closeModal();
      clearSelectionAfterFilterChange();
      await fetchClients(document.getElementById("client-filter").value);
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error(`Failed to ${action} client:`, errorData);
      let detail = errorData?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(item => item.msg || JSON.stringify(item)).join("; ");
      } else if (detail && typeof detail === "object") {
        detail = JSON.stringify(detail);
      }
      alert(`Failed to ${action} client: ${detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`Error ${action}ing client:`, error);
    alert(`Error ${action}ing client. Please check the console for details.`);
  }
}

async function deleteClient() {
  if (!currentClientId) return;

  if (!confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
    return;
  }

  try {
    const res = await fetch(`/api/clients/${currentClientId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      closeModal();
      await fetchClients(document.getElementById("client-filter").value);
    } else {
      const errorData = await res.json();
      alert(`Failed to delete client: ${errorData.detail || res.statusText}`);
    }
  } catch (error) {
    console.error("Error deleting client:", error);
    alert("Error deleting client. Please check the console for details.");
  }
}

async function fetchClientTotals(clientId) {
  try {
    const response = await fetch(`/api/reports/client/${clientId}/totals`);
    if (!response.ok) {
      throw new Error('Failed to fetch client totals');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching client totals:', error);
    return { 
      session_total: 0, 
      supervision_total: 0,
      session_count: 0,
      supervision_count: 0
    };
  }
}

function updateClientTotalsDisplay(totals) {
  const summaryDiv = document.getElementById('client-totals-summary');
  const sessionTotal = document.getElementById('client-session-total');
  const sessionCount = document.getElementById('client-session-count');
  document.getElementById('cpd-totals-summary').style.display = "none";
  document.getElementById('supervision-totals-summary').style.display = "none";

  if ((totals.session_total || 0) === 0 && (totals.session_count || 0) === 0) {
    summaryDiv.style.display = 'none';
  } else {
    summaryDiv.style.display = 'block';
    sessionTotal.textContent = formatTime(totals.session_total);
    sessionCount.textContent = totals.session_count || 0;
  }
}

async function loadNotes(clientId) {
  try {
    const [notes, totals] = await Promise.all([
      fetchNotesForClient(clientId),
      fetchClientTotals(clientId)
    ]);
    
    updateClientTotalsDisplay(totals);
  } catch (error) {
    console.error('Error loading notes:', error);
    showError('Failed to load notes');
  }
}

async function loadCPDNotes() {
  try {
    const notes = await fetchCPDNotes();
    // Hide client totals summary for CPD (CPD doesn't have client-specific totals)
    document.getElementById("client-totals-summary").style.display = "none";
    document.getElementById("supervision-totals-summary").style.display = "none";
    const totalHours = notes.reduce((sum, note) => sum + (Number(note.duration_hours) || 0), 0);
    document.getElementById("cpd-total-hours").textContent = formatHours(totalHours);
    document.getElementById("cpd-totals-summary").style.display = "block";
    return notes;
  } catch (error) {
    console.error('Error loading CPD notes:', error);
    showError('Failed to load CPD notes');
    return [];
  }
}

async function loadSupervisionNotes() {
  try {
    const notes = await fetchSupervisionNotes();
    document.getElementById("client-totals-summary").style.display = "none";
    document.getElementById("cpd-totals-summary").style.display = "none";
    const totalMinutes = notes.reduce((sum, note) => sum + (Number(note.duration_minutes) || 0), 0);
    document.getElementById("supervision-list-total-time").textContent = formatTime(totalMinutes);
    document.getElementById("supervision-list-total-count").textContent = notes.length;
    document.getElementById("supervision-totals-summary").style.display = notes.length > 0 ? "block" : "none";
    return notes;
  } catch (error) {
    console.error("Error loading supervision notes:", error);
    showError("Failed to load supervision notes");
    document.getElementById("supervision-totals-summary").style.display = "none";
    return [];
  }
}

async function fetchSupervisionNotes() {
  const list = document.getElementById("note-list");
  list.innerHTML = "";

  const supervisionRes = await fetch(`/api/supervisions/`);
  if (!supervisionRes.ok) {
    const errText = await supervisionRes.text();
    throw new Error(`Supervision fetch failed: ${supervisionRes.status} ${errText}`);
  }
  const supervisionNotes = await supervisionRes.json();
  const sortedSupervisionNotes = [...supervisionNotes].sort((a, b) =>
    compareNotesByOrder({ type: "supervision", note: a }, { type: "supervision", note: b })
  );

  sortedSupervisionNotes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card note-supervision";
    card.dataset.noteId = note.id;
    card.dataset.noteType = "supervision";

    const resolvedSessionType = note.session_type || "Online";
    const supervisionLabel = formatSupervisionNoteLabel(note);
    const cardBody = createNoteCardBody({
      primary: (note.supervisor_details || "").trim() || "Supervisor",
      date: formatDate(note.supervision_date),
      duration: `${note.duration_minutes ?? 0} min`,
      secondary: supervisionLabel.summary,
      secondaryClass: "note-card-line2-italic"
    });

    card.appendChild(createNoteCardIcon("supervision"));
    card.appendChild(cardBody);
    card.appendChild(createNoteCardActions({
      badgeText: resolvedSessionType,
      badgeClassSuffix: resolvedSessionType.toLowerCase().replace(/ /g, '-')
    }));
    card.addEventListener("click", async () => {
      if (await confirmDiscardIfDirty()) {
        loadNote("supervision", note);
      }
    });
    list.appendChild(card);
  });

  return sortedSupervisionNotes;
}

async function fetchCPDNotes() {
  const list = document.getElementById("note-list");
  list.innerHTML = "";

  const cpdRes = await fetch(`/api/cpd/`);
  if (!cpdRes.ok) {
    const errText = await cpdRes.text();
    throw new Error(`CPD fetch failed: ${cpdRes.status} ${errText}`);
  }
  const cpdNotes = await cpdRes.json();
  const sortedCpdNotes = [...cpdNotes].sort((a, b) =>
    compareNotesByOrder({ type: "cpd", note: a }, { type: "cpd", note: b })
  );

  sortedCpdNotes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card note-cpd";
    card.dataset.noteId = note.id;
    card.dataset.noteType = "cpd";

    const resolvedMedium = note.medium || "Online";
    const cardBody = createNoteCardBody({
      primary: (note.organisation || "").trim() || "Provider",
      date: formatDate(note.cpd_date),
      duration: `${note.duration_hours ?? 0} h`,
      secondary: (note.title || "").trim() || "Untitled",
      secondaryClass: "note-card-line2-title"
    });

    card.appendChild(createNoteCardIcon("cpd"));
    card.appendChild(cardBody);
    card.appendChild(createNoteCardActions({
      badgeText: resolvedMedium,
      badgeClassSuffix: resolvedMedium.toLowerCase().replace(/ /g, '-')
    }));
    card.addEventListener("click", async () => {
      if (await confirmDiscardIfDirty()) {
        loadNote("cpd", note);
      }
    });
    list.appendChild(card);
  });

  return sortedCpdNotes;
}

function initializeCalendarUI() {
  document.getElementById("calendar-toggle")?.addEventListener("click", () => {
    setCalendarMode(!isCalendarMode);
  });
  document.getElementById("calendar-today")?.addEventListener("click", () => {
    calendarFocusDate = new Date();
    refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
  });
  document.getElementById("calendar-prev")?.addEventListener("click", () => {
    shiftCalendarRange(-1);
  });
  document.getElementById("calendar-next")?.addEventListener("click", () => {
    shiftCalendarRange(1);
  });
  document.getElementById("calendar-view-week")?.addEventListener("click", () => setCalendarView("week"));
  document.getElementById("calendar-view-month")?.addEventListener("click", () => setCalendarView("month"));
  document.getElementById("calendar-view-year")?.addEventListener("click", () => setCalendarView("year"));
  document.getElementById("calendar-new-appointment")?.addEventListener("click", () => openAppointmentModal());
  document.getElementById("appointment-cancel")?.addEventListener("click", closeAppointmentModal);
  document.getElementById("appointment-form")?.addEventListener("submit", submitAppointmentForm);
  document.getElementById("occurrence-close")?.addEventListener("click", closeOccurrenceModal);
  document.getElementById("occurrence-cancel")?.addEventListener("click", cancelSelectedOccurrence);
  document.getElementById("occurrence-move")?.addEventListener("click", openMoveOccurrenceModal);
  document.getElementById("occurrence-delete")?.addEventListener("click", openDeleteScopeModal);
  document.getElementById("move-occurrence-cancel")?.addEventListener("click", closeMoveOccurrenceModal);
  document.getElementById("move-occurrence-form")?.addEventListener("submit", submitMoveOccurrenceForm);
  document.getElementById("delete-scope-cancel")?.addEventListener("click", closeDeleteScopeModal);
  document.getElementById("delete-scope-this")?.addEventListener("click", () => deleteSelectedOccurrence("this"));
  document.getElementById("delete-scope-future")?.addEventListener("click", () => deleteSelectedOccurrence("future"));
  document.getElementById("delete-scope-all")?.addEventListener("click", () => deleteSelectedOccurrence("all"));
  setCalendarView(calendarView);
}

function setCalendarMode(active) {
  isCalendarMode = active;
  document.getElementById("calendar-mode").classList.toggle("hidden", !active);
  document.getElementById("calendar-header").classList.toggle("hidden", !active);
  document.getElementById("note-header").classList.toggle("hidden", active);
  document.getElementById("calendar-toggle").classList.toggle("is-active", active);
  document.getElementById("note-form").hidden = active ? true : !currentNoteId;
  if (active) {
    refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
  }
}

function setCalendarView(view) {
  calendarView = view;
  ["week", "month", "year"].forEach(name => {
    document.getElementById(`calendar-view-${name}`)?.classList.toggle("is-selected", name === view);
  });
  refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
}

function shiftCalendarRange(direction) {
  const next = new Date(calendarFocusDate);
  if (calendarView === "week") {
    next.setDate(next.getDate() + (7 * direction));
  } else if (calendarView === "month") {
    next.setMonth(next.getMonth() + direction);
  } else {
    next.setFullYear(next.getFullYear() + direction);
  }
  calendarFocusDate = next;
  refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 7);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(date) {
  return new Date(date.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

function formatLocalDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function formatDateInputValue(date) {
  return formatLocalDateTime(date).slice(0, 10);
}

function formatTimeInputValue(date) {
  return formatLocalDateTime(date).slice(11, 16);
}

function formatCalendarTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameCalendarDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildTodaySessionsDefaultState(dayKey) {
  return {
    dayKey,
    dismissed: false,
    emptyShown: false,
    pendingReshowStart: null,
    reshowTriggeredStarts: []
  };
}

function getTodaySessionsDayKey(date = new Date()) {
  return formatDateInputValue(date);
}

function persistTodaySessionsState() {
  if (!todaySessionsState) return;
  try {
    localStorage.setItem(TODAY_SESSIONS_STORAGE_KEY, JSON.stringify(todaySessionsState));
  } catch (_error) {
    // Ignore storage failures in restricted environments.
  }
}

function ensureTodaySessionsState() {
  const dayKey = getTodaySessionsDayKey();
  const fallback = buildTodaySessionsDefaultState(dayKey);
  try {
    const stored = localStorage.getItem(TODAY_SESSIONS_STORAGE_KEY);
    if (!stored) {
      todaySessionsState = fallback;
      persistTodaySessionsState();
      return todaySessionsState;
    }
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || parsed.dayKey !== dayKey) {
      todaySessionsState = fallback;
      persistTodaySessionsState();
      return todaySessionsState;
    }
    todaySessionsState = {
      dayKey,
      dismissed: Boolean(parsed.dismissed),
      emptyShown: Boolean(parsed.emptyShown),
      pendingReshowStart: typeof parsed.pendingReshowStart === "string" ? parsed.pendingReshowStart : null,
      reshowTriggeredStarts: Array.isArray(parsed.reshowTriggeredStarts)
        ? parsed.reshowTriggeredStarts.filter(value => typeof value === "string")
        : []
    };
    return todaySessionsState;
  } catch (_error) {
    todaySessionsState = fallback;
    persistTodaySessionsState();
    return todaySessionsState;
  }
}

function formatTodaySessionsPanelDate(date = new Date()) {
  return date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getTodaySessionStatus(startDate, endDate, now = new Date()) {
  if (now < startDate) return "Upcoming";
  if (now < endDate) return "In Progress";
  return "Completed";
}

function getTodaySessionStatusClass(statusLabel) {
  if (statusLabel === "In Progress") return "in-progress";
  if (statusLabel === "Completed") return "completed";
  return "upcoming";
}

function getClientInitials(fullName) {
  const cleaned = (fullName || "").trim();
  if (!cleaned) return "??";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getNextUpcomingStartIso(sessions, now = new Date(), excludeStarts = []) {
  const excluded = new Set(excludeStarts);
  const futureStarts = sessions
    .map(session => session.start)
    .filter(startIso => {
      if (!startIso || excluded.has(startIso)) return false;
      const startDate = new Date(startIso);
      if (Number.isNaN(startDate.getTime())) return false;
      return startDate > now;
    })
    .sort((a, b) => new Date(a) - new Date(b));
  return futureStarts[0] || null;
}

function hideTodaySessionsPanel() {
  document.getElementById("today-sessions-panel")?.classList.add("hidden");
}

function renderTodaySessionsPanel(sessions, { empty = false } = {}) {
  const panel = document.getElementById("today-sessions-panel");
  const dateEl = document.getElementById("today-sessions-panel-date");
  const badgeEl = document.getElementById("today-sessions-panel-badge");
  const emptyEl = document.getElementById("today-sessions-panel-empty");
  const listEl = document.getElementById("today-sessions-panel-list");
  const moreEl = document.getElementById("today-sessions-panel-more");
  if (!panel || !dateEl || !badgeEl || !emptyEl || !listEl || !moreEl) return;

  dateEl.textContent = formatTodaySessionsPanelDate(new Date());
  listEl.innerHTML = "";

  if (empty) {
    badgeEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    listEl.classList.add("hidden");
    moreEl.classList.add("hidden");
    panel.classList.remove("hidden");
    return;
  }

  badgeEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  listEl.classList.remove("hidden");

  const now = new Date();
  const withStatus = sessions.map(session => {
    const startDate = new Date(session.start);
    const endDate = new Date(session.end);
    return {
      ...session,
      startDate,
      endDate,
      statusLabel: getTodaySessionStatus(startDate, endDate, now)
    };
  });

  const upcomingCount = withStatus.filter(session => session.statusLabel === "Upcoming").length;
  badgeEl.textContent = upcomingCount > 0 ? `${upcomingCount} upcoming` : `${withStatus.length} today`;

  const visibleSessions = withStatus.slice(0, 3);
  visibleSessions.forEach(session => {
    const row = document.createElement("li");
    row.className = "today-sessions-item";

    const avatar = document.createElement("span");
    avatar.className = "today-sessions-avatar";
    avatar.textContent = getClientInitials(session.client_name);

    const body = document.createElement("div");
    body.className = "today-sessions-item-body";

    const name = document.createElement("span");
    name.className = "today-sessions-item-name";
    name.textContent = session.client_name;

    const time = document.createElement("span");
    time.className = "today-sessions-item-time";
    time.textContent = `${formatCalendarTime(session.startDate)} - ${formatCalendarTime(session.endDate)}`;

    body.appendChild(name);
    body.appendChild(time);

    const status = document.createElement("span");
    status.className = `today-sessions-item-status ${getTodaySessionStatusClass(session.statusLabel)}`;
    status.textContent = session.statusLabel;

    row.appendChild(avatar);
    row.appendChild(body);
    row.appendChild(status);
    listEl.appendChild(row);
  });

  if (withStatus.length > 3) {
    moreEl.classList.remove("hidden");
    moreEl.textContent = `+${withStatus.length - 3} more today`;
  } else {
    moreEl.classList.add("hidden");
    moreEl.textContent = "";
  }

  panel.classList.remove("hidden");
}

function dismissTodaySessionsPanel() {
  const state = ensureTodaySessionsState();
  const now = new Date();
  state.dismissed = true;
  state.pendingReshowStart = getNextUpcomingStartIso(todaySessionsData, now, state.reshowTriggeredStarts);
  persistTodaySessionsState();
  hideTodaySessionsPanel();
}

async function fetchTodaySessions() {
  const res = await fetch("/api/calendar/today-sessions");
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Failed to load today's sessions.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function syncPendingReshowStart(sessions, now) {
  const state = ensureTodaySessionsState();
  if (!state.dismissed) return;
  const upcomingStarts = sessions
    .map(session => session.start)
    .filter(startIso => {
      const startDate = new Date(startIso);
      return !Number.isNaN(startDate.getTime()) && startDate > now;
    });
  const hasPending = state.pendingReshowStart && upcomingStarts.includes(state.pendingReshowStart);
  if (hasPending) return;
  const nextStart = getNextUpcomingStartIso(sessions, now, state.reshowTriggeredStarts);
  if (nextStart !== state.pendingReshowStart) {
    state.pendingReshowStart = nextStart;
    persistTodaySessionsState();
  }
}

function shouldTriggerPendingReshow(now) {
  const state = ensureTodaySessionsState();
  if (!state.dismissed || !state.pendingReshowStart) return false;
  if (state.reshowTriggeredStarts.includes(state.pendingReshowStart)) return false;
  const startDate = new Date(state.pendingReshowStart);
  if (Number.isNaN(startDate.getTime())) return false;
  if (now >= startDate) return false;
  const triggerDate = new Date(startDate.getTime() - (5 * 60 * 1000));
  return now >= triggerDate;
}

async function refreshTodaySessionsPanel({ initial = false } = {}) {
  const state = ensureTodaySessionsState();
  const now = new Date();
  let sessions = [];
  try {
    sessions = await fetchTodaySessions();
  } catch (error) {
    console.warn("Failed to refresh today's sessions panel:", error);
    return;
  }
  todaySessionsData = sessions;

  if (sessions.length === 0) {
    state.pendingReshowStart = null;
    if (initial && !state.emptyShown) {
      state.emptyShown = true;
      persistTodaySessionsState();
      renderTodaySessionsPanel([], { empty: true });
      return;
    }
    hideTodaySessionsPanel();
    persistTodaySessionsState();
    return;
  }

  state.emptyShown = true;
  syncPendingReshowStart(sessions, now);

  if (state.dismissed) {
    if (shouldTriggerPendingReshow(now)) {
      const triggeredStart = state.pendingReshowStart;
      state.dismissed = false;
      state.pendingReshowStart = null;
      state.reshowTriggeredStarts = Array.from(new Set([...state.reshowTriggeredStarts, triggeredStart]));
      persistTodaySessionsState();
      renderTodaySessionsPanel(sessions, { empty: false });
      return;
    }
    hideTodaySessionsPanel();
    persistTodaySessionsState();
    return;
  }

  persistTodaySessionsState();
  renderTodaySessionsPanel(sessions, { empty: false });
}

function initializeTodaySessionsPanel() {
  ensureTodaySessionsState();
  document.getElementById("today-sessions-panel-dismiss")?.addEventListener("click", dismissTodaySessionsPanel);
  refreshTodaySessionsPanel({ initial: true });
  if (todaySessionsTimerId) {
    clearInterval(todaySessionsTimerId);
  }
  todaySessionsTimerId = setInterval(() => {
    refreshTodaySessionsPanel({ initial: false });
  }, TODAY_SESSIONS_REFRESH_MS);
}

function getCalendarVisibleRange() {
  if (calendarView === "week") {
    const start = startOfWeek(calendarFocusDate);
    return { start, end: endOfWeek(calendarFocusDate) };
  }
  if (calendarView === "month") {
    const monthStart = startOfMonth(calendarFocusDate);
    const monthEnd = endOfMonth(calendarFocusDate);
    return { start: startOfWeek(monthStart), end: endOfWeek(new Date(monthEnd.getTime() - 1000)) };
  }
  return { start: startOfYear(calendarFocusDate), end: endOfYear(calendarFocusDate) };
}

function updateCalendarTitle(range) {
  const titleEl = document.getElementById("calendar-title");
  if (!titleEl) return;
  if (calendarView === "week") {
    titleEl.textContent = "";
    titleEl.classList.add("calendar-title-hidden");
  } else if (calendarView === "month") {
    titleEl.classList.remove("calendar-title-hidden");
    titleEl.textContent = calendarFocusDate.toLocaleDateString([], { month: "long", year: "numeric" });
  } else {
    titleEl.classList.remove("calendar-title-hidden");
    titleEl.textContent = String(calendarFocusDate.getFullYear());
  }
}

async function refreshCalendar() {
  if (!isCalendarMode) return;
  const range = getCalendarVisibleRange();
  updateCalendarTitle(range);
  await fetchCalendarEvents(range);
  renderCalendar(range);
}

async function fetchCalendarEvents(range) {
  const params = new URLSearchParams({
    start: formatLocalDateTime(range.start),
    end: formatLocalDateTime(range.end)
  });
  const res = await fetch(`/api/calendar/events?${params.toString()}`);
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Calendar fetch failed: ${detail}`);
  }
  const data = await res.json();
  calendarEvents = data.filter(event => event.status !== "CANCELLED");
}

function renderCalendar(range) {
  const body = document.getElementById("calendar-body");
  if (!body) return;
  body.innerHTML = "";

  if (calendarView === "week") {
    renderWeekCalendar(body, range);
  } else if (calendarView === "month") {
    renderMonthCalendar(body, range);
  } else {
    renderYearCalendar(body, range);
  }
}

function renderWeekCalendar(container, range) {
  const wrap = document.createElement("div");
  wrap.className = "calendar-week-scroll";

  const grid = document.createElement("div");
  grid.className = "calendar-week-grid";

  const timeHeader = document.createElement("div");
  timeHeader.className = "calendar-time-header";
  timeHeader.style.gridColumn = "1";
  timeHeader.style.gridRow = "1";
  grid.appendChild(timeHeader);

  const gutter = document.createElement("div");
  gutter.className = "calendar-time-gutter";
  gutter.style.gridColumn = "1";
  gutter.style.gridRow = "2";
  for (let hour = 0; hour < 24; hour++) {
    const label = document.createElement("div");
    label.className = "calendar-time-label";
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    gutter.appendChild(label);
  }
  grid.appendChild(gutter);

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayDate = new Date(range.start);
    dayDate.setDate(dayDate.getDate() + dayIndex);
    const isToday = isSameCalendarDate(dayDate, new Date());

    const header = document.createElement("div");
    header.className = `calendar-week-header-cell${isToday ? " is-today" : ""}`;
    header.style.gridColumn = String(dayIndex + 2);
    header.style.gridRow = "1";
    header.innerHTML = `<span class="calendar-day-name">${dayDate.toLocaleDateString([], { weekday: "short" })}</span><span class="calendar-day-date">${dayDate.toLocaleDateString([], { day: "numeric", month: "short" })}</span>`;
    grid.appendChild(header);

    const slotContainer = document.createElement("div");
    slotContainer.className = "calendar-week-day";
    slotContainer.style.gridColumn = String(dayIndex + 2);
    slotContainer.style.gridRow = "2";
    slotContainer.style.height = `${24 * CALENDAR_WEEK_SLOT_HEIGHT}px`;

    for (let hour = 0; hour < 24; hour++) {
      const slot = document.createElement("div");
      slot.className = "calendar-slot";
      slot.dataset.day = formatDateInputValue(dayDate);
      slot.dataset.hour = String(hour);
      slot.addEventListener("click", () => {
        const start = new Date(dayDate);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 1);
        openAppointmentModal({ start, end });
      });
      slotContainer.appendChild(slot);
    }

    const dayEvents = calendarEvents.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart.toDateString() === dayDate.toDateString();
    });
    dayEvents.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const durationMinutes = Math.max(30, (eventEnd - eventStart) / 60000);
      const block = document.createElement("button");
      block.type = "button";
      block.className = `calendar-event ${event.is_exception ? "is-exception" : ""}`;
      block.style.top = `${(startMinutes / 60) * CALENDAR_WEEK_SLOT_HEIGHT}px`;
      block.style.height = `${Math.max((durationMinutes / 60) * CALENDAR_WEEK_SLOT_HEIGHT, 28)}px`;
      block.innerHTML = `<strong>${formatCalendarTime(eventStart)} - ${formatCalendarTime(eventEnd)}</strong><span>${event.client_name}</span>`;
      block.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        openOccurrenceModal(event);
      });
      slotContainer.appendChild(block);
    });

    grid.appendChild(slotContainer);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

function renderMonthCalendar(container, range) {
  const grid = document.createElement("div");
  grid.className = "calendar-month-grid";
  const monthStart = startOfMonth(calendarFocusDate);
  const monthEnd = endOfMonth(calendarFocusDate);
  const gridStart = startOfWeek(monthStart);

  for (let i = 0; i < 42; i++) {
    const dayDate = new Date(gridStart);
    dayDate.setDate(dayDate.getDate() + i);
    if (dayDate >= range.end) break;
    const cell = document.createElement("div");
    cell.className = `calendar-month-cell ${dayDate.getMonth() !== calendarFocusDate.getMonth() ? "is-outside" : ""}`;
    const isToday = isSameCalendarDate(dayDate, new Date());
    cell.innerHTML = `<div class="calendar-month-date-number${isToday ? " is-today" : ""}">${dayDate.getDate()}</div>`;
    const dayEvents = calendarEvents.filter(event => new Date(event.start).toDateString() === dayDate.toDateString());
    dayEvents.slice(0, 4).forEach(event => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "calendar-month-event";
      chip.textContent = `${formatCalendarTime(new Date(event.start))} ${event.client_name}`;
      chip.addEventListener("click", () => openOccurrenceModal(event));
      cell.appendChild(chip);
    });
    if (dayEvents.length > 4) {
      const more = document.createElement("div");
      more.className = "calendar-month-date";
      more.textContent = `+${dayEvents.length - 4} more`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
    if (dayDate >= monthEnd && dayDate.getDay() === 0) break;
  }
  container.appendChild(grid);
}

function renderYearCalendar(container) {
  const yearGrid = document.createElement("div");
  yearGrid.className = "calendar-year-grid";
  const year = calendarFocusDate.getFullYear();

  for (let month = 0; month < 12; month++) {
    const monthWrap = document.createElement("div");
    monthWrap.className = "calendar-year-month";
    monthWrap.innerHTML = `<h4>${new Date(year, month, 1).toLocaleDateString([], { month: "long", year: "numeric" })}</h4>`;
    const daysWrap = document.createElement("div");
    daysWrap.className = "calendar-year-days";
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const gridStart = startOfWeek(monthStart);

    for (let i = 0; i < 42; i++) {
      const dayDate = new Date(gridStart);
      dayDate.setDate(dayDate.getDate() + i);
      const dayCell = document.createElement("div");
      dayCell.className = "calendar-year-day";
      dayCell.style.opacity = dayDate.getMonth() === month ? "1" : "0.4";
      const isToday = isSameCalendarDate(dayDate, new Date());
      dayCell.innerHTML = `<div class="calendar-year-day-number${isToday ? " is-today" : ""}">${dayDate.getDate()}</div>`;
      const dayEvents = calendarEvents.filter(event => new Date(event.start).toDateString() === dayDate.toDateString());
      if (dayEvents.length > 0) {
        dayCell.classList.add("has-events");
        const dot = document.createElement("span");
        dot.className = "calendar-year-dot";
        dot.setAttribute("aria-hidden", "true");
        dayCell.appendChild(dot);
      }
      daysWrap.appendChild(dayCell);
      if (dayDate >= monthEnd && dayDate.getDay() === 0) break;
    }
    monthWrap.appendChild(daysWrap);
    yearGrid.appendChild(monthWrap);
  }

  container.appendChild(yearGrid);
}

async function ensureCalendarClientOptions() {
  const select = document.getElementById("appointment-client");
  if (!select) return;
  const res = await fetch("/api/clients/?filter=active");
  const clients = await res.json();
  select.innerHTML = clients.map(client => `<option value="${client.id}">${client.full_name}</option>`).join("");
  return clients;
}

async function openAppointmentModal(selection = {}) {
  const clients = await ensureCalendarClientOptions();
  if (!clients || clients.length === 0) {
    showError("No active clients are available for booking.");
    return;
  }
  const start = selection.start || new Date();
  const end = selection.end || new Date(start.getTime() + (60 * 60000));
  document.getElementById("appointment-date").value = formatDateInputValue(start);
  document.getElementById("appointment-start").value = formatTimeInputValue(start);
  document.getElementById("appointment-end").value = formatTimeInputValue(end);
  document.getElementById("appointment-repeat").value = "NONE";
  document.getElementById("appointment-ends").value = "NEVER";
  document.getElementById("appointment-modal").classList.remove("hidden");
}

function closeAppointmentModal() {
  document.getElementById("appointment-modal").classList.add("hidden");
}

function combineDateAndTime(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}:00`);
}

async function submitAppointmentForm(event) {
  event.preventDefault();
  const payload = {
    client_id: parseInt(document.getElementById("appointment-client").value, 10),
    start_datetime: formatLocalDateTime(combineDateAndTime(document.getElementById("appointment-date").value, document.getElementById("appointment-start").value)),
    end_datetime: formatLocalDateTime(combineDateAndTime(document.getElementById("appointment-date").value, document.getElementById("appointment-end").value)),
    timezone: "Europe/London",
    recurrence_rule: document.getElementById("appointment-repeat").value
  };
  if (payload.recurrence_rule === "NONE") {
    payload.recurrence_rule = null;
  }

  const res = await fetch("/api/calendar/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showError(data.detail || "Failed to create appointment.");
    return;
  }
  closeAppointmentModal();
  refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
  refreshTodaySessionsPanel({ initial: false });
}

function openOccurrenceModal(occurrence) {
  selectedCalendarOccurrence = occurrence;
  document.getElementById("occurrence-modal-summary").textContent = `${occurrence.client_name} • ${formatCalendarTime(new Date(occurrence.start))} - ${formatCalendarTime(new Date(occurrence.end))}`;
  document.getElementById("occurrence-modal").classList.remove("hidden");
}

function closeOccurrenceModal() {
  document.getElementById("occurrence-modal").classList.add("hidden");
}

async function cancelSelectedOccurrence() {
  if (!selectedCalendarOccurrence) return;
  const res = await fetch(`/api/calendar/occurrences/${selectedCalendarOccurrence.appointment_id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ occurrence_start_datetime: selectedCalendarOccurrence.occurrence_id.split(":").slice(1).join(":") })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showError(data.detail || "Failed to cancel occurrence.");
    return;
  }
  closeOccurrenceModal();
  refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
  refreshTodaySessionsPanel({ initial: false });
}

function openMoveOccurrenceModal() {
  if (!selectedCalendarOccurrence) return;
  const start = new Date(selectedCalendarOccurrence.start);
  const end = new Date(selectedCalendarOccurrence.end);
  document.getElementById("move-occurrence-date").value = formatDateInputValue(start);
  document.getElementById("move-occurrence-start").value = formatTimeInputValue(start);
  document.getElementById("move-occurrence-end").value = formatTimeInputValue(end);
  document.getElementById("move-occurrence-modal").classList.remove("hidden");
}

function closeMoveOccurrenceModal() {
  document.getElementById("move-occurrence-modal").classList.add("hidden");
}

async function submitMoveOccurrenceForm(event) {
  event.preventDefault();
  if (!selectedCalendarOccurrence) return;
  const newStart = combineDateAndTime(document.getElementById("move-occurrence-date").value, document.getElementById("move-occurrence-start").value);
  const newEnd = combineDateAndTime(document.getElementById("move-occurrence-date").value, document.getElementById("move-occurrence-end").value);
  const res = await fetch(`/api/calendar/occurrences/${selectedCalendarOccurrence.appointment_id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      occurrence_start_datetime: selectedCalendarOccurrence.occurrence_id.split(":").slice(1).join(":"),
      new_start_datetime: formatLocalDateTime(newStart),
      new_end_datetime: formatLocalDateTime(newEnd)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showError(data.detail || "Failed to move occurrence.");
    return;
  }
  closeMoveOccurrenceModal();
  closeOccurrenceModal();
  refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
  refreshTodaySessionsPanel({ initial: false });
}

function openDeleteScopeModal() {
  document.getElementById("delete-scope-modal").classList.remove("hidden");
}

function closeDeleteScopeModal() {
  document.getElementById("delete-scope-modal").classList.add("hidden");
}

async function deleteSelectedOccurrence(scope) {
  if (!selectedCalendarOccurrence) return;
  const params = new URLSearchParams({ scope });
  params.set("occurrence_start_datetime", selectedCalendarOccurrence.occurrence_id.split(":").slice(1).join(":"));
  const res = await fetch(`/api/calendar/occurrences/${selectedCalendarOccurrence.appointment_id}?${params.toString()}`, {
    method: "DELETE"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showError(data.detail || "Failed to delete appointment.");
    return;
  }
  closeDeleteScopeModal();
  closeOccurrenceModal();
  refreshCalendar().catch(error => showError(error.message || "Failed to load calendar."));
  refreshTodaySessionsPanel({ initial: false });
}
