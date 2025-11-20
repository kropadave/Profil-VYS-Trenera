const user = localStorage.getItem("user");
if (!user) window.location.href = "index.html";

// Profesionální uvítání
const welcomeEl = document.getElementById("welcome");
welcomeEl.innerHTML = `
  <div class="welcome-title">Docházka trenérů</div>
  <div class="welcome-subtitle">Přehled tréninků, docházky a výplat</div>
  <div class="welcome-user">Přihlášený uživatel: <b>${user}</b></div>
`;

// ------------------ FUNKCE PRO TABS ------------------
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  const active = document.getElementById(tab);
  if (active) active.style.display = "block";

  // zvýraznění aktivního tlačítka
  document.querySelectorAll(".tabs-nav button").forEach(btn => btn.classList.remove("active"));
  const clicked = Array.from(document.querySelectorAll(".tabs-nav button"))
    .find(b => b.getAttribute("onclick")?.includes(tab));
  if (clicked) clicked.classList.add("active");
}

// ------------------ LOGOUT ------------------
function logout() {
  if (confirm("Opravdu se chcete odhlásit?")) {
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }
}

// ------------------ FETCH DAT ZE SHEETU ------------------
async function fetchSheet(name) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${name}?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.values || [];
}

// ------------------ ZÍSKAT KLÍČ TRENÉRA ------------------
async function getTrainerKey() {
  const map = await fetchSheet(SHEETS.MAPA_JMEN);
  const rows = map.slice(1);
  const record = rows.find(r => r[1]?.trim().toLowerCase() === user.toLowerCase());
  return record ? record[3] : null; // sloupec D = klíč
}

// ------------------ TRÉNINKY ------------------
async function loadTreningy() {
  const data = await fetchSheet(SHEETS.MAPA_JMEN);
  const rows = data.slice(1);
  const record = rows.find(r => r[1]?.trim().toLowerCase() === user.toLowerCase());

  const el = document.getElementById("treningy");

  if (record) {
    el.innerHTML = `
      <div class="card">
        <h3>Pravidelné tréninky</h3>
        <div class="card-body">
          ${record[5] || "<span class='muted'>Žádné pravidelné tréninky</span>"}
        </div>
      </div>
      <div class="card">
        <h3>Zástupné tréninky</h3>
        <div class="card-body">
          ${record[6] || "<span class='muted'>Žádné zástupné tréninky</span>"}
        </div>
      </div>
    `;
  } else {
    el.innerHTML = `<div class="card"><p class="muted">Žádné tréninky k zobrazení.</p></div>`;
  }
}

// ------------------ DOCHÁZKA ------------------
async function loadDochazka() {
  const key = await getTrainerKey();
  const el = document.getElementById("dochazka");

  if (!key) {
    el.innerHTML = `<div class="card"><p class="muted">Nenalezen tvůj přihlašovací klíč.</p></div>`;
    return;
  }

  const data = await fetchSheet(SHEETS.SUPER_DOCHAZKA);
  const rows = data.slice(1).filter(r => r[3] === key);

  let rowsHtml = `<tr><td colspan="2" class="muted center">Žádná docházka</td></tr>`;
  if (rows.length > 0) {
    rowsHtml = rows.map(r => `<tr><td>${r[0]}</td><td>${r[4]}</td></tr>`).join("");
  }

  el.innerHTML = `
    <div class="card">
      <h3>Historie docházky</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Datum a čas</th><th>Lokace</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ------------------ VÝPLATY ------------------
async function loadVyplaty() {
  const key = await getTrainerKey();
  const el = document.getElementById("vyplaty");

  if (!key) {
    el.innerHTML = `<div class="card"><p class="muted">Trenér nebyl nalezen v MapaJmen.</p></div>`;
    return;
  }

  const data = await fetchSheet(SHEETS.VYPLATY);

  const month = data[0][1] || "Neznámý měsíc";
  const rows = data.slice(2);
  const myPayments = rows.filter(r => r[0] === key);

  let rowsHtml = `<tr><td colspan="3" class="muted center">Žádné výplaty k zobrazení</td></tr>`;

  if (myPayments.length > 0) {
    rowsHtml = myPayments.map(r => {
      const count = r[2] || 0;
      const amount = r[3] || count * 400;

      return `
        <tr>
          <td>${month}</td>
          <td>${count}</td>
          <td class="amount">${amount}</td>
        </tr>
      `;
    }).join("");
  }

  el.innerHTML = `
    <div class="card">
      <h3>Přehled výplat</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Měsíc</th><th>Počet tréninků</th><th>Částka (Kč)</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ------------------ HISTORIE VÝPLAT ------------------
async function loadHistorieVyplat() {
  const data = await fetchSheet(SHEETS.ZAZNAMY_VYPLAT);
  const rows = data.slice(1).filter(r => r[0]?.trim().toLowerCase() === user.toLowerCase());

  const el = document.getElementById("historie");

  let rowsHtml = `<tr><td colspan="3" class="muted center">Žádné záznamy</td></tr>`;

  if (rows.length > 0) {
    rowsHtml = rows.map(r => {
      const paid = r[2] === 'TRUE'
        ? "<span class='badge success'>Vyplaceno</span>"
        : "<span class='badge warning'>Nevyplaceno</span>";
      return `
        <tr>
          <td>${r[1]}</td>
          <td>${paid}</td>
          <td class="amount">${r[3]}</td>
        </tr>
      `;
    }).join("");
  }

  el.innerHTML = `
    <div class="card">
      <h3>Záznamy výplat</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Měsíc</th><th>Vyplaceno</th><th>Částka</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ------------------ NAČTENÍ DAT ------------------
loadTreningy();
loadDochazka();
loadVyplaty();
loadHistorieVyplat();
showTab("treningy");
