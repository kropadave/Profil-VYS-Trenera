document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Nastavení Logout tlačítka
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    }

    fetchData(token);
});

async function fetchData(token) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/data`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "index.html";
            }
            throw new Error("Chyba při načítání dat");
        }

        const data = await response.json();
        renderDashboard(data);

    } catch (error) {
        console.error("Chyba:", error);
        document.getElementById("content").innerHTML = `<p style="color: var(--danger); text-align: center;">Nepodařilo se načíst data.</p>`;
    }
}

function renderDashboard(data) {
    const nav = document.getElementById("navigation");
    const content = document.getElementById("content");

    nav.innerHTML = "";
    content.innerHTML = "";

    // Vytvoříme navigační tlačítka a obsah
    Object.keys(data).forEach((sectionName, index) => {
        // 1. Navigační tlačítko
        const btn = document.createElement("button");
        btn.textContent = sectionName;
        btn.onclick = () => {
            // Deaktivace všech tlačítek
            document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
            // Aktivace kliknutého
            btn.classList.add("active");
            
            // Skrytí všech sekcí
            document.querySelectorAll(".tab").forEach(tab => tab.style.display = "none");
            // Zobrazení vybrané sekce
            document.getElementById(`tab-${index}`).style.display = "block";
            
            // Animace fadeIn při přepnutí
            const activeTab = document.getElementById(`tab-${index}`);
            activeTab.style.animation = 'none';
            activeTab.offsetHeight; /* trigger reflow */
            activeTab.style.animation = 'fadeInUp 0.5s ease-out';
        };
        nav.appendChild(btn);

        // 2. Obsahová sekce (Tab)
        const sectionDiv = document.createElement("div");
        sectionDiv.id = `tab-${index}`;
        sectionDiv.className = "tab";
        sectionDiv.style.display = index === 0 ? "block" : "none"; // První je vidět

        // Pokud je to první tlačítko, označíme ho jako aktivní
        if (index === 0) btn.classList.add("active");

        // Zpracování podsekcí (tabulek) v rámci hlavního klíče
        const subSections = data[sectionName];
        
        // Iterace přes položky v sekci
        // Očekáváme, že subSections může být pole objektů nebo objekt
        // Zde předpokládám strukturu z vašeho původního kódu, 
        // upravuji jen HTML obalování (wrapping)
        
        if (typeof subSections === 'object') {
             // Zde generujeme "Karty" pro každou tabulku
             for (const [subTitle, tableData] of Object.entries(subSections)) {
                 const cardHtml = buildTableCard(subTitle, tableData);
                 sectionDiv.innerHTML += cardHtml;
             }
        }

        content.appendChild(sectionDiv);
    });
}

/**
 * Funkce pro vytvoření moderní karty s tabulkou
 */
function buildTableCard(title, dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return `
        <div class="card-glass">
            <h3 class="table-title">${title}</h3>
            <p style="color: var(--text-secondary)">Žádná data k dispozici.</p>
        </div>`;
    }

    // Získání hlaviček z prvního objektu
    const headers = Object.keys(dataArray[0]);

    let tableHtml = `
    <div class="card-glass">
        <h3 class="table-title">${title}</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${formatHeader(h)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${dataArray.map(row => `
                        <tr>
                            ${headers.map(h => {
                                const val = row[h];
                                // Detekce, zda jde o částku (jednoduchá logika podle názvu nebo obsahu)
                                const isAmount = typeof val === 'number' || (typeof val === 'string' && val.includes('Kč'));
                                const cellClass = isAmount ? 'amount' : '';
                                return `<td class="${cellClass}">${val}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `;

    return tableHtml;
}

function formatHeader(header) {
    // Převede camelCase nebo snake_case na čitelný text
    // např. "celkovaCena" -> "Celkova Cena"
    return header
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
}
