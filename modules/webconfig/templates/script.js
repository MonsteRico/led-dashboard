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
    fetch("/api/spotify/login")
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
document.addEventListener("DOMContentLoaded", function () {
    loadConfig();
    loadNetworkStatus();
});

// WiFi Configuration Functions
function loadNetworkStatus() {
    fetch("/api/network/status")
        .then((response) => response.json())
        .then((data) => {
            updateNetworkStatusUI(data);
        })
        .catch((error) => {
            console.error("Error loading network status:", error);
            updateNetworkStatusUI({
                hasInternet: false,
                localIp: "Error",
                currentSSID: "Error",
                lastChecked: new Date().toISOString(),
            });
        });
}

function updateNetworkStatusUI(networkConfig) {
    const internetStatus = document.getElementById("internetStatus");
    const localIp = document.getElementById("localIp");
    const currentSSID = document.getElementById("currentSSID");
    const lastChecked = document.getElementById("lastChecked");
    const wifiConfig = document.getElementById("wifiConfig");

    // Update internet status
    if (networkConfig.hasInternet) {
        internetStatus.textContent = "Connected";
        internetStatus.className = "value connected";
        wifiConfig.style.display = "none";
    } else {
        internetStatus.textContent = "Disconnected";
        internetStatus.className = "value disconnected";
        wifiConfig.style.display = "block";
    }

    // Update other status items
    localIp.textContent = networkConfig.localIp || "Not available";
    currentSSID.textContent = networkConfig.currentSSID || "Not connected";

    // Format last checked time
    const lastCheckedDate = new Date(networkConfig.lastChecked);
    lastChecked.textContent = lastCheckedDate.toLocaleString();
}

function refreshNetworkStatus() {
    const internetStatus = document.getElementById("internetStatus");
    internetStatus.textContent = "Checking...";
    internetStatus.className = "value";

    loadNetworkStatus();
}

function configureWifi(event) {
    event.preventDefault();

    const form = event.target;
    const ssid = form.ssid.value;
    const password = form.password.value;
    const wifiStatus = document.getElementById("wifiStatus");

    if (!ssid || !password) {
        showWifiStatus("Please enter both SSID and password", "error");
        return;
    }

    // Show loading status
    showWifiStatus("Configuring WiFi...", "info");

    fetch("/api/network/configure", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ ssid, password }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showWifiStatus(data.message, "success");
                // Clear form
                form.reset();
                // Refresh network status after a delay
                setTimeout(() => {
                    refreshNetworkStatus();
                }, 5000);
            } else {
                showWifiStatus(data.message || "Failed to configure WiFi", "error");
            }
        })
        .catch((error) => {
            console.error("Error configuring WiFi:", error);
            showWifiStatus("Error configuring WiFi", "error");
        });
}

function showWifiStatus(message, type) {
    const wifiStatus = document.getElementById("wifiStatus");
    wifiStatus.textContent = message;
    wifiStatus.className = `wifi-status ${type}`;
    wifiStatus.style.display = "block";

    // Auto-hide success messages after 5 seconds
    if (type === "success") {
        setTimeout(() => {
            wifiStatus.style.display = "none";
        }, 5000);
    }
}
