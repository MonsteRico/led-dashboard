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
    loadEnvVariables();
    loadControlStatus();
    checkForUpdates();
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

// Environment Variables Functions
function loadEnvVariables() {
    fetch("/api/env/variables")
        .then((response) => response.json())
        .then((data) => {
            updateEnvVariablesUI(data);
        })
        .catch((error) => {
            console.error("Error loading environment variables:", error);
            showEnvStatus("Error loading environment variables", "error");
        });
}

function updateEnvVariablesUI(variables) {
    const envVariablesList = document.getElementById("envVariablesList");
    envVariablesList.innerHTML = "";

    variables.forEach((variable) => {
        const envVariableDiv = document.createElement("div");
        envVariableDiv.className = "env-variable";

        const headerDiv = document.createElement("div");
        headerDiv.className = "env-variable-header";

        const nameSpan = document.createElement("span");
        nameSpan.className = "env-variable-name";
        nameSpan.textContent = variable.name;

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "env-variable-toggle";
        toggleButton.textContent = variable.isHidden ? "Show" : "Hide";
        toggleButton.onclick = () => toggleEnvVariableVisibility(variable.name);

        headerDiv.appendChild(nameSpan);
        headerDiv.appendChild(toggleButton);

        const descriptionDiv = document.createElement("div");
        descriptionDiv.className = "env-variable-description";
        descriptionDiv.textContent = variable.description || "";

        const input = document.createElement("input");
        input.type = "text";
        input.className = `env-variable-input ${variable.isHidden ? "hidden" : ""}`;
        input.name = variable.name;
        input.value = variable.value;
        input.placeholder = `Enter ${variable.name}`;

        envVariableDiv.appendChild(headerDiv);
        envVariableDiv.appendChild(descriptionDiv);
        envVariableDiv.appendChild(input);

        envVariablesList.appendChild(envVariableDiv);
    });
}

function toggleEnvVariableVisibility(variableName) {
    const input = document.querySelector(`input[name="${variableName}"]`);
    const toggleButton = input.parentElement.querySelector(".env-variable-toggle");

    if (input.classList.contains("hidden")) {
        input.classList.remove("hidden");
        toggleButton.textContent = "Hide";
    } else {
        input.classList.add("hidden");
        toggleButton.textContent = "Show";
    }
}

function saveEnvVariables(event) {
    event.preventDefault();

    const form = event.target;
    const inputs = form.querySelectorAll("input[type='text']");
    const variables = [];

    inputs.forEach((input) => {
        variables.push({
            name: input.name,
            value: input.value,
        });
    });

    showEnvStatus("Saving environment variables...", "info");

    fetch("/api/env/variables", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ variables }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showEnvStatus(data.message, "success");

                // Show validation errors if any
                if (data.errors && data.errors.length > 0) {
                    showEnvErrors(data.errors);
                } else {
                    // Schedule reboot after successful save
                    setTimeout(() => {
                        rebootDevice();
                    }, 2000);
                }
            } else {
                showEnvStatus(data.message || "Failed to save environment variables", "error");
                if (data.errors && data.errors.length > 0) {
                    showEnvErrors(data.errors);
                }
            }
        })
        .catch((error) => {
            console.error("Error saving environment variables:", error);
            showEnvStatus("Error saving environment variables", "error");
        });
}

function showEnvStatus(message, type) {
    const envStatus = document.getElementById("envStatus");
    envStatus.textContent = message;
    envStatus.className = `env-status ${type}`;
    envStatus.style.display = "block";

    // Auto-hide success messages after 5 seconds
    if (type === "success") {
        setTimeout(() => {
            envStatus.style.display = "none";
        }, 5000);
    }
}

function showEnvErrors(errors) {
    const envStatus = document.getElementById("envStatus");
    const errorsDiv = document.createElement("div");
    errorsDiv.className = "env-errors";

    const errorsList = document.createElement("ul");
    errors.forEach((error) => {
        const li = document.createElement("li");
        li.textContent = error;
        errorsList.appendChild(li);
    });

    errorsDiv.appendChild(errorsList);
    envStatus.appendChild(errorsDiv);
}

function rebootDevice() {
    fetch("/api/env/reboot", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showEnvStatus(data.message, "info");
            } else {
                showEnvStatus(data.message || "Failed to reboot device", "error");
            }
        })
        .catch((error) => {
            console.error("Error rebooting device:", error);
            showEnvStatus("Error rebooting device", "error");
        });
}

// Dashboard Control Functions
function loadControlStatus() {
    fetch("/api/control/status")
        .then((response) => response.json())
        .then((data) => {
            updateControlStatusUI(data);
        })
        .catch((error) => {
            console.error("Error loading control status:", error);
            showControlStatus("Error loading control status", "error");
        });
}

function updateControlStatusUI(appInfo) {
    const currentAppName = document.getElementById("currentAppName");
    const appPosition = document.getElementById("appPosition");

    currentAppName.textContent = appInfo.appName || "Unknown";
    appPosition.textContent = `${appInfo.currentApp + 1} of ${appInfo.totalApps}`;
}

function refreshControlStatus() {
    loadControlStatus();
}

function triggerSinglePress() {
    fetch("/api/control/single-press", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showControlStatus(data.message, "success");
                // Refresh status after a short delay
                setTimeout(() => {
                    loadControlStatus();
                }, 500);
            } else {
                showControlStatus(data.message || "Failed to trigger single press", "error");
            }
        })
        .catch((error) => {
            console.error("Error triggering single press:", error);
            showControlStatus("Error triggering single press", "error");
        });
}

function triggerDoublePress() {
    fetch("/api/control/double-press", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showControlStatus(data.message, "success");
            } else {
                showControlStatus(data.message || "Failed to trigger double press", "error");
            }
        })
        .catch((error) => {
            console.error("Error triggering double press:", error);
            showControlStatus("Error triggering double press", "error");
        });
}

function triggerTriplePress() {
    fetch("/api/control/triple-press", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showControlStatus(data.message, "success");
            } else {
                showControlStatus(data.message || "Failed to trigger triple press", "error");
            }
        })
        .catch((error) => {
            console.error("Error triggering triple press:", error);
            showControlStatus("Error triggering triple press", "error");
        });
}

function triggerLongPress() {
    fetch("/api/control/long-press", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showControlStatus(data.message, "success");
            } else {
                showControlStatus(data.message || "Failed to trigger long press", "error");
            }
        })
        .catch((error) => {
            console.error("Error triggering long press:", error);
            showControlStatus("Error triggering long press", "error");
        });
}

function triggerRotateLeft() {
    fetch("/api/control/rotate-left", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showControlStatus(data.message, "success");
            } else {
                showControlStatus(data.message || "Failed to trigger rotate left", "error");
            }
        })
        .catch((error) => {
            console.error("Error triggering rotate left:", error);
            showControlStatus("Error triggering rotate left", "error");
        });
}

function triggerRotateRight() {
    fetch("/api/control/rotate-right", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showControlStatus(data.message, "success");
            } else {
                showControlStatus(data.message || "Failed to trigger rotate right", "error");
            }
        })
        .catch((error) => {
            console.error("Error triggering rotate right:", error);
            showControlStatus("Error triggering rotate right", "error");
        });
}

function showControlStatus(message, type) {
    const controlStatus = document.querySelector(".control-status-message");
    controlStatus.textContent = message;
    controlStatus.className = `control-status-message ${type}`;
    controlStatus.style.display = "block";

    // Auto-hide success messages after 3 seconds
    if (type === "success") {
        setTimeout(() => {
            controlStatus.style.display = "none";
        }, 3000);
    }
}

// Update Functions
function checkForUpdates() {
    const currentVersion = document.getElementById("currentVersion");
    const latestVersion = document.getElementById("latestVersion");
    const updateAvailable = document.getElementById("updateAvailable");

    currentVersion.textContent = "Checking...";
    latestVersion.textContent = "-";
    updateAvailable.textContent = "-";

    fetch("/api/update/check")
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                currentVersion.textContent = "Error";
                latestVersion.textContent = "Error";
                updateAvailable.textContent = "Error";
                showUpdateStatus("Error checking for updates", "error");
            } else {
                currentVersion.textContent = data.currentVersion;
                latestVersion.textContent = data.latestVersion;
                updateAvailable.textContent = data.updateAvailable ? "Yes" : "No";

                if (data.updateAvailable) {
                    showUpdateActions(data.latestVersion);
                } else {
                    hideUpdateActions();
                }
            }
        })
        .catch((error) => {
            console.error("Error checking for updates:", error);
            currentVersion.textContent = "Error";
            latestVersion.textContent = "Error";
            updateAvailable.textContent = "Error";
            showUpdateStatus("Error checking for updates", "error");
        });
}

function showUpdateActions(latestVersion) {
    const updateActions = document.getElementById("updateActions");
    const updateMessage = document.getElementById("updateMessage");

    updateMessage.textContent = `A new version (${latestVersion}) is available for installation.`;
    updateActions.style.display = "block";
}

function hideUpdateActions() {
    const updateActions = document.getElementById("updateActions");
    updateActions.style.display = "none";
}

function performUpdate() {
    const updateProgress = document.getElementById("updateProgress");
    const updateButton = document.querySelector("#updateActions .btn-primary");
    const latestVersion = document.getElementById("latestVersion").textContent;

    if (latestVersion === "-" || latestVersion === "Error") {
        showUpdateStatus("No valid version available for update", "error");
        return;
    }

    // Show progress and disable button
    updateProgress.style.display = "block";
    updateButton.disabled = true;
    updateButton.textContent = "Installing...";

    fetch("/api/update/perform", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ version: latestVersion }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showUpdateStatus(data.message, "success");

                // If update was successful, show a message about service restart
                if (data.message.includes("restart")) {
                    showUpdateStatus("Update completed! The service is restarting. Please wait a moment and refresh the page.", "info");

                    // Try to reconnect after a delay
                    setTimeout(() => {
                        showUpdateStatus("Attempting to reconnect to the service...", "info");
                        // Try to check for updates again to see if service is back
                        setTimeout(() => {
                            checkForUpdates();
                        }, 5000);
                    }, 10000);
                } else {
                    // Refresh update status after a delay
                    setTimeout(() => {
                        checkForUpdates();
                    }, 3000);
                }
            } else {
                showUpdateStatus(data.message || "Update failed", "error");
            }
        })
        .catch((error) => {
            console.error("Error performing update:", error);
            showUpdateStatus("Error performing update", "error");
        })
        .finally(() => {
            // Hide progress and re-enable button
            updateProgress.style.display = "none";
            updateButton.disabled = false;
            updateButton.textContent = "Install Update";
        });
}

function showUpdateStatus(message, type) {
    const updateStatus = document.getElementById("updateStatusMessage");
    updateStatus.textContent = message;
    updateStatus.className = `update-status-message ${type}`;
    updateStatus.style.display = "block";

    // Auto-hide success messages after 5 seconds
    if (type === "success") {
        setTimeout(() => {
            updateStatus.style.display = "none";
        }, 5000);
    }
}
