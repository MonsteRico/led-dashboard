function loadConfig() {
    fetch("/api/config")
        .then((response) => response.json())
        .then((data) => {
            const appList = document.getElementById("appList");
            appList.innerHTML = "";

            data.apps.forEach((app) => {
                const appItem = document.createElement("div");
                appItem.className = "app-item";
                appItem.innerHTML = `
                    <label for="${app.className}">${app.name}</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="${app.className}" ${app.enabled ? "checked" : ""}>
                        <span class="slider"></span>
                    </div>
                `;
                appList.appendChild(appItem);
            });
        })
        .catch((error) => {
            showStatus("Error loading configuration", "error");
        });
}

function saveConfig() {
    const apps = [];
    const checkboxes = document.querySelectorAll('#appList input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
        const label = checkbox.parentElement.previousElementSibling.textContent;
        apps.push({
            name: label,
            enabled: checkbox.checked,
            className: checkbox.id,
        });
    });

    fetch("/api/config", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ apps }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showStatus("Configuration saved successfully!", "success");
            } else {
                showStatus("Error saving configuration", "error");
            }
        })
        .catch((error) => {
            showStatus("Error saving configuration", "error");
        });
}

function showStatus(message, type) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";

    setTimeout(() => {
        status.style.display = "none";
    }, 3000);
}

function loginToSpotify() {
    fetch("/spotify/login")
        .then((response) => response.json())
        .then((data) => {
            if (data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                showStatus("Error getting Spotify login URL", "error");
            }
        })
        .catch((error) => {
            showStatus("Error connecting to Spotify", "error");
        });
}

// Load config on page load
document.addEventListener("DOMContentLoaded", loadConfig);
