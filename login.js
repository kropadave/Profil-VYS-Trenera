async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  errorEl.textContent = "";
  errorEl.classList.remove("login-error");

  if (!/^\d{6}$/.test(password)) {
    errorEl.textContent = "Heslo musí být přesně 6 číslic.";
    errorEl.classList.add("login-error");
    return;
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEETS.MAPA_JMEN}?key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values.slice(1);

    const user = rows.find(r => r[1] === username && r[3] === password); // B = jméno, D = heslo

    if (user) {
      localStorage.setItem("user", username);
      window.location.href = "dashboard.html";
    } else {
      errorEl.textContent = "Nesprávné jméno nebo heslo.";
      errorEl.classList.add("login-error");
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Chyba při přihlášení.";
    errorEl.classList.add("login-error");
  }
}
