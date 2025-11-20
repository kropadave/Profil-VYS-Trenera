document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("login-btn");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("error-msg");

    // Funkce pro přihlášení
    async function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        errorMsg.textContent = ""; // Vymazat předchozí chyby
        loginBtn.innerHTML = '<div class="loader"></div> Načítám...'; // Indikace načítání (pokud máte CSS pro loader)

        if (!username || !password) {
            errorMsg.textContent = "Vyplňte prosím obě pole.";
            resetButton();
            return;
        }

        try {
            // Načtení databáze uživatelů
            // Používáme CONFIG.API_URL z config.js
            const response = await fetch(CONFIG.API_URL);
            
            if (!response.ok) {
                throw new Error(`Chyba sítě: ${response.status}`);
            }

            const data = await response.json();
            
            // Hledání uživatele v datech
            // Předpokládáme strukturu: { "users": [ { "username": "...", "password": "...", "role": "..." } ] }
            // NEBO pokud je meta.json přímo pole uživatelů, upravíme logiku níže.
            
            let user = null;

            // Varianta 1: meta.json obsahuje objekt s klíčem "users"
            if (data.users && Array.isArray(data.users)) {
                user = data.users.find(u => u.username === username && u.password === password);
            } 
            // Varianta 2: meta.json je přímo pole objektů
            else if (Array.isArray(data)) {
                user = data.find(u => u.username === username && u.password === password);
            }
            // Varianta 3: Specifická struktura pro váš projekt?
            else {
                console.error("Neznámá struktura JSON dat:", data);
            }

            if (user) {
                // Úspěšné přihlášení
                localStorage.setItem("token", "logged_in"); // Jednoduchý token
                localStorage.setItem("currentUser", JSON.stringify(user));
                
                loginBtn.innerHTML = '<span>Úspěch!</span>';
                loginBtn.style.background = 'var(--success)';
                
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 500);
            } else {
                errorMsg.textContent = "Špatné jméno nebo heslo.";
                resetButton();
            }

        } catch (error) {
            console.error("Chyba přihlášení:", error);
            errorMsg.textContent = "Chyba připojení k databázi (meta.json nenalezen).";
            resetButton();
        }
    }

    function resetButton() {
        loginBtn.innerHTML = '<span>Vstoupit do systému</span><div class="arrow">→</div>';
        loginBtn.style.background = ''; // Reset barvy
    }

    // Event listenery
    loginBtn.addEventListener("click", handleLogin);

    // Odeslání Enterem
    passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
    });
});
