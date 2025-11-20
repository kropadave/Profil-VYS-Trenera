/* 
   LOGIN.JS - Opravená verze
   Logika: Původní (Google Sheets API)
   Vzhled: Nový (Glassmorphism)
*/

document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("login-btn");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("error-msg"); // V novém HTML se to jmenuje error-msg

    // Event Listenery pro kliknutí a Enter
    loginBtn.addEventListener("click", login);
    
    passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") login();
    });
    usernameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
             if(passwordInput.value === "") passwordInput.focus();
             else login();
        }
    });

    async function login() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Reset chyb a stylování
        errorMsg.textContent = "";
        errorMsg.style.color = "var(--danger)";
        
        // Indikace načítání na tlačítku
        const originalBtnContent = loginBtn.innerHTML;
        loginBtn.innerHTML = 'Načítám...';
        loginBtn.style.opacity = "0.7";
        loginBtn.disabled = true;

        // 1. Validace hesla (musí být 6 číslic, jak bylo ve vašem originálním kódu)
        if (!/^\d{6}$/.test(password)) {
            showError("Heslo musí být přesně 6 číslic.");
            resetButton(originalBtnContent);
            return;
        }

        try {
            // Používáme proměnné z config.js (SHEET_ID, SHEETS, API_KEY)
            // Ujistěte se, že config.js je správně načtený v index.html
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEETS.MAPA_JMEN}?key=${API_KEY}`;
            
            const res = await fetch(url);
            
            if (!res.ok) {
                throw new Error(`Chyba API: ${res.status}`);
            }

            const data = await res.json();
            
            if (!data.values) {
                throw new Error("Žádná data v tabulce.");
            }

            // Slice(1) přeskočí hlavičku tabulky
            const rows = data.values.slice(1);

            // Hledání uživatele: Sloupec B (index 1) = jméno, Sloupec D (index 3) = heslo
            const user = rows.find(r => r[1] === username && r[3] === password); 

            if (user) {
                // Úspěch!
                loginBtn.innerHTML = 'Úspěch!';
                loginBtn.style.background = 'var(--success)';
                
                // Uložení do localStorage
                localStorage.setItem("user", username);
                
                // Přesměrování
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 500);
            } else {
                showError("Nesprávné jméno nebo heslo.");
                resetButton(originalBtnContent);
            }

        } catch (err) {
            console.error(err);
            showError("Chyba při přihlášení (zkontrolujte konzoli).");
            resetButton(originalBtnContent);
        }
    }

    function showError(text) {
        errorMsg.textContent = text;
        // Jemná animace zatřesení pro chybu
        const wrapper = document.querySelector('.login-wrapper');
        wrapper.style.animation = 'none';
        wrapper.offsetHeight; /* trigger reflow */
        wrapper.style.animation = 'shake 0.4s ease-in-out';
    }

    function resetButton(originalContent) {
        loginBtn.innerHTML = originalContent;
        loginBtn.style.opacity = "1";
        loginBtn.disabled = false;
        loginBtn.style.background = ""; // Reset barvy
    }
});

// Přidejte tuto malou animaci do CSS nebo sem dynamicky
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
`;
document.head.appendChild(style);
