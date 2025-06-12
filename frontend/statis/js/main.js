let quill;
let currentClientId = null;
let currentNoteId = null;

// Init Quill editor
window.addEventListener("load", () => {
  quill = new Quill("#editor", {
    theme: "snow"
  });

  // Load clients on start
  fetchClients();
});

async function fetchClients() {
  const res = await fetch("/api/clients/");
  const clients = await res.json();

  const list = document.getElementById("client-list");
  list.innerHTML = "";
  clients.forEach(client => {
    const item = document.createElement("li");
    item.textContent = client.full_name;
    item.dataset.id = client.id;
    item.addEventListener("click", () => selectClient(client.id, client.full_name));
    list.appendChild(item);
  });
}

async function selectClient(id, name) {
  currentClientId = id;
  document.getElementById("client-name-header").textContent = name;
  document.getElementById("add-note").disabled = false;
  fetchNotesForClient(id);
}

async function fetchNotesForClient(clientId) {
  const res = await fetch(`/api/sessions/client/${clientId}`);
  const notes = await res.json();

  const list = document.getElementById("note-list");
  list.innerHTML = "";
  notes.forEach(note => {
    const item = document.createElement("li");
    item.textContent = `${note.session_date} (${note.duration_minutes} min)`;
    item.addEventListener("click", () => loadNote(note));
    list.appendChild(item);
  });
}

function loadNote(note) {
  currentNoteId = note.id;
  document.getElementById("note-form").hidden = false;
  document.getElementById("note-title").textContent = `Session on ${note.session_date}`;
  document.getElementById("note-date").value = note.session_date;
  document.getElementById("note-duration").value = note.duration_minutes;
  document.getElementById("note-paid").checked = note.is_paid;
  quill.setText(note.content || "");
}

document.getElementById("note-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    session_date: document.getElementById("note-date").value,
    duration_minutes: parseInt(document.getElementById("note-duration").value),
    is_paid: document.getElementById("note-paid").checked,
    content: quill.getText()
  };

  const res = await fetch(`/api/sessions/${currentNoteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    document.getElementById("save-status").textContent = "Saved";
    setTimeout(() => document.getElementById("save-status").textContent = "", 2000);
  }
});
