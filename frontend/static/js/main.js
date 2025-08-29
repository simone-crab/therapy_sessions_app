let quill;
let currentClientId = null;
let currentNoteId = null;
let currentNoteType = "session";
let currentClientDetails = null;
let allClients = [];

window.addEventListener("load", () => {
  document.getElementById("client-filter").addEventListener("change", (e) => {
    fetchClients(e.target.value);
    updateGlobalTimeTotals();
  });

  quill = new Quill("#editor", {
    theme: "snow",
    modules: { toolbar: "#editor-toolbar" }
  });

  fetchClients();
  updateGlobalTimeTotals(); // Initial load of totals

  document.getElementById("add-client").addEventListener("click", openClientPrompt);
  document.getElementById("add-note").addEventListener("click", (e) => {
    e.preventDefault();
    openNoteTypeModal();
  });

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("cancel-note-type").addEventListener("click", closeNoteTypeModal);
  document.getElementById("create-session-note").addEventListener("click", () => createNewNote("session"));
  document.getElementById("create-assessment-note").addEventListener("click", () => createNewNote("assessment"));
  document.getElementById("create-supervision-note").addEventListener("click", () => createNewNote("supervision"));

  document.getElementById("client-info-form").addEventListener("submit", submitClientEdit);
  document.getElementById("note-form").addEventListener("submit", submitNoteUpdate);

  document.getElementById("client-search").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allClients.filter(c =>
      c.full_name.toLowerCase().includes(term)
    );
    renderClientList(filtered);
  });

  document.getElementById("toggle-archive-btn").addEventListener("click", toggleArchiveStatus);
  document.getElementById("delete-client-btn").addEventListener("click", deleteClient);
});

async function fetchClients(filter = "active") {
  const res = await fetch(`/api/clients/?filter=${filter}`);
  allClients = await res.json();
  renderClientList(allClients);
}

function renderClientList(clients) {
  const list = document.getElementById("client-list");
  list.innerHTML = "";

  clients.forEach(client => {
    const li = document.createElement("li");
    li.dataset.id = client.id;

    li.addEventListener("click", () => selectClient(client.id, client.full_name));

    const nameSpan = document.createElement("span");
    nameSpan.textContent = client.full_name;

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
}

function selectClient(id, name) {
  currentClientId = id;
  document.getElementById("client-name-header").textContent = name;
  document.getElementById("add-note").disabled = false;
  loadNotes(id);

  document.querySelectorAll("#client-list li").forEach(el => el.classList.remove("selected"));
  const selectedItem = document.querySelector(`#client-list li[data-id="${id}"]`);
  if (selectedItem) selectedItem.classList.add("selected");
}

async function fetchNotesForClient(clientId) {
  const list = document.getElementById("note-list");
  list.innerHTML = "";

  const [sessionsRes, assessmentsRes, supervisionsRes] = await Promise.all([
    fetch(`/api/sessions/client/${clientId}`),
    fetch(`/api/assessments/client/${clientId}`),
    fetch(`/api/supervisions/client/${clientId}`)
  ]);

  const [sessions, assessments, supervisions] = await Promise.all([
    sessionsRes.json(),
    assessmentsRes.json(),
    supervisionsRes.json()
  ]);

  assessments.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card note-assessment";
    card.dataset.noteId = note.id;
    card.textContent = `Assessment – ${note.assessment_date}`;
    card.addEventListener("click", () => loadNote("assessment", note));
    list.appendChild(card);
  });

  sessions.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card note-session";
    card.dataset.noteId = note.id;
    
    // Create a container for the session info
    const sessionInfo = document.createElement("div");
    sessionInfo.className = "session-info";
    sessionInfo.textContent = `${note.session_date} (${note.duration_minutes} min)`;

    // Create the session type badge
    const typeBadge = document.createElement("span");
    typeBadge.className = `session-type-badge ${note.session_type ? note.session_type.toLowerCase().replace(/ /g, '-') : 'in-person'}`;
    typeBadge.textContent = note.session_type || "In-Person";

    // Create the payment status indicator
    const paymentIndicator = document.createElement("div");
    paymentIndicator.className = `payment-indicator ${note.is_paid ? 'paid' : 'unpaid'}`;
    paymentIndicator.title = note.is_paid ? 'Paid' : 'Unpaid';

    // Add elements to the card
    card.appendChild(sessionInfo);
    card.appendChild(typeBadge);
    card.appendChild(paymentIndicator);

    card.addEventListener("click", () => loadNote("session", note));
    list.appendChild(card);
  });

  supervisions.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card note-supervision";
    card.dataset.noteId = note.id;
    card.textContent = `Supervision – ${note.supervision_date}`;
    card.addEventListener("click", () => loadNote("supervision", note));
    list.appendChild(card);
  });
}

async function loadNote(type, note) {
  // Remove selection from all notes
  document.querySelectorAll('.note-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Add selection to the clicked note
  const selectedCard = document.querySelector(`.note-card[data-note-id="${note.id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }

  // Show the form
  const form = document.getElementById("note-form");
  form.hidden = false;

  currentNoteId = note.id;
  currentNoteType = type;
  
  const dateField = type === "assessment" ? "assessment_date" :
                   type === "supervision" ? "supervision_date" : "session_date";
  
  document.getElementById("note-title").textContent = `${capitalize(type)} on ${note[dateField]}`;
  document.getElementById("note-date").value = note[dateField];
  document.getElementById("note-duration").value = note.duration_minutes || "";
  document.getElementById("note-paid").checked = note.is_paid || false;
  if (type === "session") {
    const radioButtons = document.getElementsByName("note-session-type");
    for (let radio of radioButtons) {
      if (radio.value === (note.session_type || "In-Person")) {
        radio.checked = true;
        break;
      }
    }
  }
  quill.setText(note.content || "");
}

async function submitNoteUpdate(e) {
  e.preventDefault();
  const payload = {
    content: quill.getText()
  };

  const urlMap = {
    session: `/api/sessions/${currentNoteId}`,
    assessment: `/api/assessments/${currentNoteId}`,
    supervision: `/api/supervisions/${currentNoteId}`
  };

  const dateField = currentNoteType === "assessment" ? "assessment_date" :
                    currentNoteType === "supervision" ? "supervision_date" : "session_date";

  payload[dateField] = document.getElementById("note-date").value;

  const duration = document.getElementById("note-duration").value;
  if (duration) {
    payload.duration_minutes = parseInt(duration);
  }
  if (currentNoteType === "session") {
    payload.is_paid = document.getElementById("note-paid").checked;
    const selectedRadio = document.querySelector('input[name="note-session-type"]:checked');
    payload.session_type = selectedRadio ? selectedRadio.value : "In-Person";
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
    await loadNotes(currentClientId);
    await updateGlobalTimeTotals();
  }  
}

function openNoteTypeModal() {
  document.getElementById("note-type-modal").classList.remove("hidden");
}

function closeNoteTypeModal() {
  document.getElementById("note-type-modal").classList.add("hidden");
}

async function createNewNote(type) {
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    content: "",
    ...(type === "session" && {
      client_id: currentClientId,
      session_date: today,
      duration_minutes: 50,
      is_paid: false,
      session_type: "In-Person"
    }),
    ...(type === "assessment" && {
      client_id: currentClientId,
      assessment_date: today
    }),
    ...(type === "supervision" && {
      client_id: currentClientId,
      supervision_date: today
    })
  };

  const urlMap = {
    session: "/api/sessions/",
    assessment: "/api/assessments/",
    supervision: "/api/supervisions/"
  };

  const res = await fetch(urlMap[type], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    const newNote = await res.json();
    closeNoteTypeModal();
    await loadNotes(currentClientId);
    await updateGlobalTimeTotals();
    loadNote(type, newNote);
  } else {
    alert("Failed to create note.");
  }
}

function openClientPrompt() {
  currentClientId = null;  // Reset the current client ID
  document.getElementById("client-modal").classList.remove("hidden");
  document.getElementById("client-info-form").reset();
  document.getElementById("toggle-archive-btn").style.display = "none";
  document.getElementById("delete-client-btn").style.display = "none";
}

async function openEditModal(clientId) {
  const client = allClients.find(c => c.id === clientId);
  if (!client) return;

  currentClientId = clientId;

  document.getElementById("modal-first-name").value = client.first_name;
  document.getElementById("modal-last-name").value = client.last_name;
  document.getElementById("modal-email").value = client.email || "";
  document.getElementById("modal-phone").value = client.phone || "";
  document.getElementById("modal-dob").value = client.date_of_birth || "";
  document.getElementById("modal-assessment-date").value = client.initial_assessment_date || "";
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

  document.getElementById("toggle-archive-btn").style.display = "block";
  document.getElementById("delete-client-btn").style.display = "block";
  document.getElementById("toggle-archive-btn").textContent = client.status === "active" ? "Archive" : "Unarchive";

  document.getElementById("client-modal").classList.remove("hidden");
}

async function submitClientEdit(e) {
  e.preventDefault();
  
  const formData = {
    first_name: document.getElementById("modal-first-name").value,
    last_name: document.getElementById("modal-last-name").value,
    email: document.getElementById("modal-email").value,
    phone: document.getElementById("modal-phone").value,
    date_of_birth: document.getElementById("modal-dob").value,
    initial_assessment_date: document.getElementById("modal-assessment-date").value,
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
      closeModal();
      await fetchClients(document.getElementById("client-filter").value);
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

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

async function updateGlobalTimeTotals() {
  try {
    // Always use 'all' filter for global totals to include all sessions
    const res = await fetch(`/api/reports/totals?filter=all`);
    if (!res.ok) {
      throw new Error(`Failed to fetch totals: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Update the totals with proper formatting
    document.getElementById("session-total").textContent = formatTime(data.total_session_minutes || 0);
    document.getElementById("supervision-total").textContent = formatTime(data.total_supervision_minutes || 0);
  } catch (err) {
    console.error("Error loading time totals:", err);
    // Show error state in the UI
    document.getElementById("session-total").textContent = "Error";
    document.getElementById("supervision-total").textContent = "Error";
  }
}

function closeModal() {
  document.getElementById("client-modal").classList.add("hidden");
  currentClientDetails = null;
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
    const res = await fetch(`/api/clients/${currentClientId}/archive?archive=${newStatus}`, {
      method: "POST"
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Successfully ${action}ed client:`, data);
      closeModal();
      await fetchClients(document.getElementById("client-filter").value);
    } else {
      const errorData = await res.json();
      console.error(`Failed to ${action} client:`, errorData);
      alert(`Failed to ${action} client: ${errorData.detail || 'Unknown error'}`);
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
    return { session_total: 0, supervision_total: 0 };
  }
}

function updateClientTotalsDisplay(totals) {
  const summaryDiv = document.getElementById('client-totals-summary');
  const sessionTotal = document.getElementById('client-session-total');
  const supervisionTotal = document.getElementById('client-supervision-total');

  if (totals.session_total === 0 && totals.supervision_total === 0) {
    summaryDiv.style.display = 'none';
  } else {
    summaryDiv.style.display = 'block';
    sessionTotal.textContent = formatTime(totals.session_total);
    supervisionTotal.textContent = formatTime(totals.supervision_total);
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