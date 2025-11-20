const user = localStorage.getItem("user");
if (!user) window.location.href = "index.html";

// Profesionální uvítání (Upravené styly pro tmavý režim)
const welcomeEl = document.getElementById("welcome");
welcomeEl.innerHTML = `
  <div style="margin-bottom:5px;">
    <span style="font-size:2rem;font-weight:800;letter-spacing:1px;color:#fff;">Docházka trenérů</span>
  </div>
  <div style="font-size:1rem;font-weight:400;color:#94a3b8;margin-bottom:10px;">Administrace</div>
  <div style="font-size:0.9rem;color:#cbd5e1;">Uživatel: <b style='color:#34d399;'>${user}</b></div>
`;

// ------------------ FUNKCE PRO TABS ------------------
function showTab(tabId) {
  // Skryjeme všechny taby
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  // Zobrazíme vybraný
  const selected = document.getElementById(tabId);
  if(selected) selected.style.display = "block";
  
  // Ošetření tlačítek (volitelné - aktivní stav)
  document.querySelectorAll("nav button").forEach(b => b.style.borderColor = "var(--glass-border)");
  event.target.style.borderColor = "var(--primary)";
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

  const container = document.getElementById("treningy");

  if (record) {
    container.innerHTML = `
      <h3>Vaše tréninky</h3>
      <div style="margin-bottom:20px;">
        <div style="color:var(--text-secondary);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Pravidelné</div>
        <div style="font-size:1.1rem;color:white;background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;border:1px solid var(--glass-border);">
          ${record[5] || "Žádné záznamy"}
        </div>
      </div>
      <div>
        <div style="color:var(--text-secondary);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Zástupy</div>
        <div style="font-size:1.1rem;color:white;background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;border:1px solid var(--glass-border);">
          ${record[6] || "Žádné záznamy"}
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `<p style="color:var(--text-secondary)">Žádné tréninky k zobrazení.</p>`;
  }
}

// ------------------ DOCHÁZKA ------------------
async function loadDochazka() {
  const key = await getTrainerKey();
  if (!key) {
    document.getElementById("dochazka").innerHTML = "<p>Nenalezen tvůj přihlašovací klíč.</p>";
    return;
  }

  const data = await fetchSheet(SHEETS.SUPER_DOCHAZKA);
  const rows = data.slice(1).filter(r => r[3] === key);

  let html = `<tr><td colspan="2" style="text-align:center;color:var(--text-secondary);">Žádná data</td></tr>`;
  if (rows.length > 0) {
    html = rows.map(r => `<tr><td>${r[0]}</td><td>${r[4]}</td></tr>`).join("");
  }

  document.getElementById("dochazka").innerHTML = `
    <h3>Historie docházky</h3>
    <div class="table-responsive">
        <table>
        <thead><tr><th>Datum a čas</th><th>Lokace</th></tr></thead>
        <tbody>${html}</tbody>
        </table>
    </div>
  `;
}

// ------------------ VÝPLATY ------------------
async function loadVyplaty() {
  const key = await getTrainerKey();
  const container = document.getElementById("vyplaty");
  
  if (!key) {
    container.innerHTML = "<p>Trenér nebyl nalezen.</p>";
    return;
  }

  const data = await fetchSheet(SHEETS.VYPLATY);
  const month = data[0][1] || "Neznámý měsíc";
  const rows = data.slice(2); 
  const myPayments = rows.filter(r => r[0] === key);

  let html = `<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);">Žádné výplaty</td></tr>`;

  if (myPayments.length > 0) {
    html = myPayments.map(r => {
      const count = r[2] || 0;               
      const amount = r[3] || count * 400;    

      return `<tr>
        <td>${month}</td>
        <td>${count}</td>
        <td class="amount">${amount} Kč</td>
      </tr>`;
    }).join("");
  }

  container.innerHTML = `
    <h3>Aktuální výplata</h3>
    <div class="table-responsive">
        <table>
        <thead><tr><th>Měsíc</th><th>Tréninky</th><th>Částka</th></tr></thead>
        <tbody>${html}</tbody>
        </table>
    </div>
  `;
}

// ------------------ HISTORIE VÝPLAT ------------------
async function loadHistorieVyplat() {
  const data = await fetchSheet(SHEETS.ZAZNAMY_VYPLAT);
  const rows = data.slice(1).filter(r => r[0]?.trim().toLowerCase() === user.toLowerCase());

  let html = `<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);">Prázdné</td></tr>`;
  if (rows.length > 0) {
    html = rows.map(r => {
      const paid = r[2] === 'TRUE' ? "<span style='color:#34d399;'>✔ Vyplaceno</span>" : "<span style='color:#f87171;'>✖ Čeká</span>";
      return `<tr><td>${r[1]}</td><td>${paid}</td><td class='amount'>${r[3]} Kč</td></tr>`;
    }).join("");
  }

  document.getElementById("historie").innerHTML = `
    <h3>Historie</h3>
    <div class="table-responsive">
        <table>
        <thead><tr><th>Měsíc</th><th>Stav</th><th>Částka</th></tr></thead>
        <tbody>${html}</tbody>
        </table>
    </div>
  `;
}

// ------------------ START ------------------
loadTreningy();
loadDochazka();
loadVyplaty();
loadHistorieVyplat();

// Defaultně zobrazit první tab
document.getElementById("treningy").style.display = "block";
