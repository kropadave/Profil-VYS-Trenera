const user = localStorage.getItem("user");
if (!user) window.location.href = "index.html";

// Profesionální uvítání
const welcomeEl = document.getElementById("welcome");
welcomeEl.innerHTML = `
  <div class="welcome-title">Docházka trenérů</div>
  <div class="welcome-subtitle">Přehled tréninků, docházky a výplat</div>
  <div class="welcome-user">Přihlášený uživatel: <b>${user}</b></div>
`;

// ------------------ TABS ------------------
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

// ------------------ GOOGLE SHEETS HELPER ------------------
async function fetchSheet(name) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${name}?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.values || [];
}

// ------------------ KLÍČ TRENÉRA ------------------
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

// ------------------ DOCHÁZKA – DATA A FILTR ------------------
let dochazkaAllRows = []; // uložíme si všechny záznamy po načtení

async function loadDochazka() {
  const key = await getTrainerKey();
  const el = document.getElementById("dochazka");

  if (!key) {
    el.innerHTML = `<div class="card"><p class="muted">Nenalezen tvůj přihlašovací klíč.</p></div>`;
    return;
  }

  const data = await fetchSheet(SHEETS.SUPER_DOCHAZKA);
  // očekáváme: [datum, ..., ..., klíč, lokace]
  dochazkaAllRows = data.slice(1).filter(r => r[3] === key);

  console.log("Načtená docházka (vše):", dochazkaAllRows.map(r => r[0]));

  renderDochazkaSection(dochazkaAllRows);
}

/**
 * Vykreslí kartu docházky včetně filtrů
 * @param {Array} rows - pole řádků (filtrovaných)
 */
function renderDochazkaSection(rows) {
  const el = document.getElementById("dochazka");

  let rowsHtml = `<tr><td colspan="2" class="muted center">Žádná docházka</td></tr>`;
  if (rows.length > 0) {
    rowsHtml = rows.map(r => `<tr><td>${r[0]}</td><td>${r[4]}</td></tr>`).join("");
  }

  el.innerHTML = `
    <div class="card">
      <h3>Historie docházky</h3>

      <div class="filter-row">
        <div class="filter-field">
          <label for="dateExact">Konkrétní datum</label>
          <input type="date" id="dateExact">
        </div>
        <div class="filter-field">
          <label for="dateFrom">Od</label>
          <input type="date" id="dateFrom">
        </div>
        <div class="filter-field">
          <label for="dateTo">Do</label>
          <input type="date" id="dateTo">
        </div>
        <div class="filter-buttons">
          <button class="secondary-btn" id="filterApply">Filtrovat</button>
          <button class="ghost-btn" id="filterClear">Vymazat</button>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Datum a čas</th><th>Lokace</th></tr>
          </thead>
          <tbody id="dochazkaBody">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Přiřadit události tlačítkům
  document.getElementById("filterApply").onclick = applyDochazkaFilter;
  document.getElementById("filterClear").onclick = clearDochazkaFilter;
}

/**
 * Převede český formát (např. "1. 1. 2025 18:00" nebo "1.1.2025") na objekt Date.
 */
function parseCzechDate(raw) {
  if (!raw) return null;

  const str = raw.toString().trim();

  // oddělit datum + čas (čas ignorujeme)
  const [datePart] = str.split(" ");

  // odstraníme případné mezery po tečkách "1. 1. 2025"
  const normalized = datePart.replace(/\s/g, ""); // "1.1.2025"
  const parts = normalized.split(".");

  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  if (!day || isNaN(month) || !year) return null;

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;

  return d;
}

/**
 * Aplikace filtru docházky:
 *  - Pokud je vyplněno "Konkrétní datum" => filtr jen na ten den.
 *  - Jinak pokud je vyplněno Od/Do => filtr na rozmezí.
 */
function applyDochazkaFilter() {
  const exact = document.getElementById("dateExact").value;
  const from = document.getElementById("dateFrom").value;
  const to = document.getElementById("dateTo").value;

  console.log("Filtr – exact:", exact, "from:", from, "to:", to);

  let filtered = dochazkaAllRows;

  if (exact) {
    const exactDate = new Date(exact);
    filtered = dochazkaAllRows.filter(r => {
      const d = parseCzechDate(r[0]);
      if (!d) return false;
      return d.toDateString() === exactDate.toDateString();
    });
  } else if (from || to) {
    let fromDate = from ? new Date(from) : null;
    let toDate = to ? new Date(to) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    filtered = dochazkaAllRows.filter(r => {
      const d = parseCzechDate(r[0]);
      if (!d) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }

  console.log("Výsledek filtru – počet řádků:", filtered.length);

  // přerenderovat pouze tbody
  let rowsHtml = `<tr><td colspan="2" class="muted center">Žádná docházka</td></tr>`;
  if (filtered.length > 0) {
    rowsHtml = filtered.map(r => `<tr><td>${r[0]}</td><td>${r[4]}</td></tr>`).join("");
  }
  document.getElementById("dochazkaBody").innerHTML = rowsHtml;
}

/** Vymazat filtr – zobrazit vše */
function clearDochazkaFilter() {
  document.getElementById("dateExact").value = "";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";

  let rowsHtml = `<tr><td colspan="2" class="muted center">Žádná docházka</td></tr>`;
  if (dochazkaAllRows.length > 0) {
    rowsHtml = dochazkaAllRows.map(r => `<tr><td>${r[0]}</td><td>${r[4]}</td></tr>`).join("");
  }
  document.getElementById("dochazkaBody").innerHTML = rowsHtml;
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

// ------------------ START ------------------
loadTreningy();
loadDochazka();
loadVyplaty();
loadHistorieVyplat();
showTab("treningy");
