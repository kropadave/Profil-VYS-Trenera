const user = localStorage.getItem("user");
if (!user) window.location.href = "index.html";

document.getElementById("welcome").textContent = `Vítej, ${user}!`;

// ------------------ FUNKCE PRO TABS ------------------
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  document.getElementById(tab).style.display = "block";
}

// ------------------ LOGOUT ------------------
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
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
      <h3>Pravidelné tréninky:</h3>
      <p>${record[5] || "—"}</p>
      <h3>Zástupné tréninky:</h3>
      <p>${record[6] || "—"}</p>
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

// ------------------ VÝPLATY BEZ ŠIPEK ------------------
async function loadVyplaty() {
  const key = await getTrainerKey();
  if (!key) {
    document.getElementById("vyplaty").innerHTML = "<p>Trenér nebyl nalezen v MapaJmen.</p>";
    return;
  }

  const data = await fetchSheet(SHEETS.VYPLATY);
  const rows = data.slice(2); // od 3. řádku
  const myPayments = rows.filter(r => r[0] === key);

  let html = `<tr><td colspan="3">Žádné výplaty k zobrazení</td></tr>`;
  if (myPayments.length > 0) {
    html = myPayments.map(r => {
      const month = r[1] || "Neznámý měsíc"; // sloupec B = měsíc
      const count = r[2] || 0;               // sloupec C = počet tréninků
      const amount = r[3] || count * 400;    // sloupec D = částka, pokud chybí, spočítat ×400

      return `<tr>
        <td>${month}</td>
        <td>${count}</td>
        <td>${amount}</td>
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
    html = rows.map(r => `<tr><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
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
