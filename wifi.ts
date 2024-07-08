import { createServer } from "http";
import { readFile, writeFile } from "fs";
import { parse } from "querystring";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const port = 3000;

const startServer = () => {
    const server = createServer((req, res) => {
        if (req.method === "GET" && req.url === "/") {
            res.writeHead(200, { "Content-Type": "text/html" });
            readFile(path.join(__dirname, "public", "index.html"), (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end("Error loading index.html");
                    return;
                }
                res.end(data);
            });
        } else if (req.method === "POST" && req.url === "/setup_wifi") {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", () => {
                const { ssid, password } = parse(body);
                const config = `
                    network={
                        ssid="${ssid}"
                        psk="${password}"
                    }
                    `;
                writeFile("/etc/wpa_supplicant/wpa_supplicant.conf", config, { flag: "a" }, (err) => {
                    if (err) {
                        res.writeHead(500);
                        res.end("Error updating WiFi configuration");
                        return;
                    }
                    exec("sudo systemctl restart dhcpcd && sudo systemctl restart wpa_supplicant", (error, stdout, stderr) => {
                        if (error) {
                            res.writeHead(500);
                            res.end("Error restarting WiFi services");
                            return;
                        }
                        res.writeHead(200, { "Content-Type": "text/html" });
                        res.end("WiFi configuration updated successfully. The Raspberry Pi will connect to the new network shortly.");
                    });
                });
            });
        } else {
            res.writeHead(404);
            res.end("Not Found");
        }
    });

    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
};

export const checkWiFiConnection = async (): Promise<boolean> => {
    try {
        const { stdout } = await execAsync("/usr/local/bin/check_wifi.sh");
        if (stdout.trim() === "Not Connected") {
            // Start hostapd and dnsmasq
            await execAsync("sudo systemctl start hostapd && sudo systemctl start dnsmasq");
            console.log("Access Point started");
            startServer();
            return false;
        } else {
            console.log("Already connected to Wi-Fi");
            return true;
        }
    } catch (error) {
        console.error(`exec error: ${error}`);
        return false;
    }
};
