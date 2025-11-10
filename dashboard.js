const user = localStorage.getItem("user");
if (!user) window.location.href = "index.html";

// Profesionální uvítání
const welcomeEl = document.getElementById("welcome");
welcomeEl.innerHTML = `
  <div style="margin-top:36px;margin-bottom:10px;">
    <span style="font-size:2.1rem;font-weight:800;color:#644fff;letter-spacing:1px;">Docházka trenérů</span>
  </div>
  <div style="font-size:1.15rem;font-weight:500;color:#333;margin-bottom:4px;">Vítejte v aplikaci pro správu docházky a výplat</div>
  <div style="font-size:1rem;font-weight:400;color:#666;">Přihlášený uživatel: <b style='color:#1fa463;'>${user}</b></div>
`;

// ------------------ FUNKCE PRO TABS ------------------
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  document.getElementById(tab).style.display = "block";
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

  if (record) {
    document.getElementById("treningy").innerHTML = `
      <div style="padding:24px 0 8px 0;">
        <h3 style="font-size:1.4em;color:#644fff;display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span>🏋️</span> Pravidelné tréninky
        </h3>
        <div style="font-size:1.1em;padding:10px 18px;background:#f7f5fb;border-radius:12px;margin-bottom:18px;min-height:32px;">
          ${record[5] || "<span style='color:#aaa;'>Žádné pravidelné tréninky</span>"}
        </div>
        <h3 style="font-size:1.2em;color:#644fff;display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span>🔄</span> Zástupné tréninky
        </h3>
        <div style="font-size:1.1em;padding:10px 18px;background:#f7f5fb;border-radius:12px;min-height:32px;">
          ${record[6] || "<span style='color:#aaa;'>Žádné zástupné tréninky</span>"}
        </div>
      </div>
    `;
  } else {
    document.getElementById("treningy").innerHTML = `<p>Žádné tréninky k zobrazení.</p>`;
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

  let html = `<tr><td colspan="2">Žádná docházka</td></tr>`;
  if (rows.length > 0) {
    html = rows.map(r => `<tr><td>${r[0]}</td><td>${r[4]}</td></tr>`).join("");
  }

  document.getElementById("dochazka").innerHTML = `
    <h3>Historie docházky</h3>
    <table>
      <tr><th>Datum a čas</th><th>Lokace</th></tr>
      ${html}
    </table>
  `;
}

// ------------------ VÝPLATY ------------------

async function loadVyplaty() {
  const key = await getTrainerKey();
  if (!key) {
    document.getElementById("vyplaty").innerHTML = "<p>Trenér nebyl nalezen v MapaJmen.</p>";
    return;
  }

  const data = await fetchSheet(SHEETS.VYPLATY);

  // ✅ měsíc je v B1
  const month = data[0][1] || "Neznámý měsíc";

  const rows = data.slice(2); 
  const myPayments = rows.filter(r => r[0] === key);

  let html = `<tr><td colspan="3">Žádné výplaty k zobrazení</td></tr>`;

  if (myPayments.length > 0) {
    html = myPayments.map(r => {
      const count = r[2] || 0;               
      const amount = r[3] || count * 400;    

      return `<tr>
        <td>${month}</td>
        <td>${count}</td>
        <td class="amount">${amount}</td>
      </tr>`;
    }).join("");
  }

  document.getElementById("vyplaty").innerHTML = `
    <h3>Přehled výplat</h3>
    <table>
      <tr><th>Měsíc</th><th>Počet tréninků</th><th>Částka (Kč)</th></tr>
      ${html}
    </table>
  `;
}

// ------------------ HISTORIE VÝPLAT ------------------
async function loadHistorieVyplat() {
  const data = await fetchSheet(SHEETS.ZAZNAMY_VYPLAT);
  const rows = data.slice(1).filter(r => r[0]?.trim().toLowerCase() === user.toLowerCase());

  let html = `<tr><td colspan="3">Žádné záznamy</td></tr>`;
  if (rows.length > 0) {
    html = rows.map(r => {
      const paid = r[2] === 'TRUE' ? "<span style='font-size:1.3em;'>✅</span>" : r[2];
      return `<tr><td>${r[1]}</td><td>${paid}</td><td class='amount'>${r[3]}</td></tr>`;
    }).join("");
  }

  document.getElementById("historie").innerHTML = `
    <h3>Záznamy výplat</h3>
    <table>
      <tr><th>Měsíc</th><th>Vyplaceno</th><th>Částka</th></tr>
      ${html}
    </table>
  `;
}

// ------------------ NAČTENÍ DAT ------------------
loadTreningy();
loadDochazka();
loadVyplaty();
loadHistorieVyplat();
showTab("treningy");
