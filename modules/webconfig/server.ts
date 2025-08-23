import { serve } from "bun";
import { join } from "path";
import { configManager } from "@/modules/config/config-manager";
import { spotifyIntegration, type SpotifyIntegration } from "../spotify/spotify-integration";
import { wifiService } from "../wifi/wifi-service";
import { envService } from "../env/env-service";
import { controlService } from "../control/control-service";

export interface ServerConfig {
    port: number;
    useHttps: boolean;
    certPath?: string;
    keyPath?: string;
}

export class WebServer {
    private config: ServerConfig;
    private spotifyIntegration: SpotifyIntegration | null;

    constructor(config: ServerConfig | number = 3000) {
        if (typeof config === "number") {
            this.config = {
                port: config,
                useHttps: false,
            };
        } else {
            this.config = config;
        }

        // Initialize Spotify integration only if required environment variables are set
        try {
            if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
                this.spotifyIntegration = spotifyIntegration;
            } else {
                console.warn("Spotify integration not available: Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
                this.spotifyIntegration = null;
            }
        } catch (error) {
            console.warn("Spotify integration not available:", (error as Error).message);
            this.spotifyIntegration = null;
        }
    }

    public start(): void {
        const protocol = this.config.useHttps ? "HTTPS" : "HTTP";
        console.log(`Starting ${protocol} server on port ${this.config.port}`);

        const serverOptions: any = {
            port: this.config.port,
            fetch: this.handleRequest.bind(this),
        };

        // Add HTTPS configuration if enabled
        if (this.config.useHttps && this.config.certPath && this.config.keyPath) {
            try {
                const cert = Bun.file(this.config.certPath);
                const key = Bun.file(this.config.keyPath);

                serverOptions.tls = {
                    cert: cert,
                    key: key,
                };

                console.log(`HTTPS enabled with certificates:`);
                console.log(`  Certificate: ${this.config.certPath}`);
                console.log(`  Private Key: ${this.config.keyPath}`);
            } catch (error) {
                console.error("Failed to load SSL certificates:", error);
                console.log("Falling back to HTTP...");
            }
        }

        serve(serverOptions);
    }

    private async handleRequest(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            switch (path) {
                case "/":
                    return await this.serveHtmlFile("index.html");

                case "/static/styles.css":
                    return await this.serveStaticFile("styles.css", "text/css");

                case "/static/script.js":
                    return await this.serveStaticFile("script.js", "application/javascript");

                case "/api/config":
                    if (request.method === "GET") {
                        return this.getConfig();
                    } else if (request.method === "POST") {
                        return await this.updateConfig(request);
                    }
                    break;

                case "/api/spotify/login":
                    return this.handleSpotifyLogin();
                case "/api/spotify/callback":
                    return await this.handleSpotifyCallback(request);

                case "/api/network/status":
                    return await this.getNetworkStatus();

                case "/api/network/configure":
                    if (request.method === "POST") {
                        return await this.configureWifi(request);
                    }
                    break;

                case "/api/env/variables":
                    if (request.method === "GET") {
                        return this.getEnvVariables();
                    } else if (request.method === "POST") {
                        return await this.updateEnvVariables(request);
                    }
                    break;

                case "/api/env/reboot":
                    if (request.method === "POST") {
                        return await this.rebootDevice();
                    }
                    break;

                case "/api/control/status":
                    if (request.method === "GET") {
                        return this.getControlStatus();
                    }
                    break;

                case "/api/control/single-press":
                    if (request.method === "POST") {
                        return await this.triggerSinglePress();
                    }
                    break;

                case "/api/control/double-press":
                    if (request.method === "POST") {
                        return await this.triggerDoublePress();
                    }
                    break;

                case "/api/control/triple-press":
                    if (request.method === "POST") {
                        return await this.triggerTriplePress();
                    }
                    break;

                case "/api/control/long-press":
                    if (request.method === "POST") {
                        return await this.triggerLongPress();
                    }
                    break;

                case "/api/control/rotate-left":
                    if (request.method === "POST") {
                        return await this.triggerRotateLeft();
                    }
                    break;

                case "/api/control/rotate-right":
                    if (request.method === "POST") {
                        return await this.triggerRotateRight();
                    }
                    break;

                default:
                    return new Response("Not Found", { status: 404 });
            }
        } catch (error) {
            console.error("Error handling request:", error);
            return new Response("Internal Server Error", { status: 500 });
        }

        return new Response("Method Not Allowed", { status: 405 });
    }

    private async serveHtmlFile(filename: string): Promise<Response> {
        try {
            const filePath = join(__dirname, "templates", filename);
            const file = Bun.file(filePath);
            if (await file.exists()) {
                const content = await file.text();
                return new Response(content, {
                    headers: { "Content-Type": "text/html" },
                });
            } else {
                return new Response("File not found", { status: 404 });
            }
        } catch (error) {
            console.error("Error serving HTML file:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    private async serveStaticFile(filename: string, contentType: string): Promise<Response> {
        try {
            const filePath = join(__dirname, "templates", filename);
            const file = Bun.file(filePath);
            if (await file.exists()) {
                const content = await file.text();
                return new Response(content, {
                    headers: { "Content-Type": contentType },
                });
            } else {
                return new Response("File not found", { status: 404 });
            }
        } catch (error) {
            console.error("Error serving static file:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    }

    private getConfig(): Response {
        const config = configManager.getConfig();
        return new Response(JSON.stringify(config), {
            headers: { "Content-Type": "application/json" },
        });
    }

    private async updateConfig(request: Request): Promise<Response> {
        try {
            const body = await request.json();
            await configManager.updateApps(body.apps);

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error updating config:", error);
            return new Response(JSON.stringify({ success: false, error: "Invalid request" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private handleSpotifyLogin(): Response {
        if (!this.spotifyIntegration) {
            return new Response(
                JSON.stringify({
                    error: "Spotify integration not available. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
                }),
                {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        try {
            const authUrl = this.spotifyIntegration.getAuthUrl();
            return new Response(JSON.stringify({ authUrl }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error generating Spotify auth URL:", error);
            return new Response(JSON.stringify({ error: "Failed to generate auth URL" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async handleSpotifyCallback(request: Request): Promise<Response> {
        if (!this.spotifyIntegration) {
            return new Response("Spotify integration not available", { status: 503 });
        }

        try {
            const url = new URL(request.url);
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");

            if (!code) {
                return new Response("Missing authorization code", { status: 400 });
            }

            const tokens = await this.spotifyIntegration.handleCallback(code, state || "");

            return new Response(
                `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Spotify Authentication Success</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .success { color: #1DB954; }
                        .btn { background: #1DB954; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1 class="success">Spotify Authentication Successful!</h1>
                    <p>You have successfully connected your Spotify account.</p>
                    <a href="/" class="btn">Return to Dashboard</a>
                </body>
                </html>
            `,
                {
                    headers: { "Content-Type": "text/html" },
                },
            );
        } catch (error) {
            console.error("Error handling Spotify callback:", error);
            return new Response(
                `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Spotify Authentication Error</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #e74c3c; }
                        .btn { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Spotify Authentication Failed</h1>
                    <p>There was an error connecting your Spotify account.</p>
                    <a href="/" class="btn">Return to Dashboard</a>
                </body>
                </html>
            `,
                {
                    headers: { "Content-Type": "text/html" },
                },
            );
        }
    }

    private async getNetworkStatus(): Promise<Response> {
        try {
            const networkConfig = await wifiService.updateNetworkStatus();
            return new Response(JSON.stringify(networkConfig), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error getting network status:", error);
            return new Response(JSON.stringify({ error: "Failed to get network status" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async configureWifi(request: Request): Promise<Response> {
        try {
            const body = await request.json();
            const { ssid, password } = body;

            if (!ssid || !password) {
                return new Response(JSON.stringify({ success: false, message: "SSID and password are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const result = await wifiService.configureWifiAndReboot({ ssid, password });
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error configuring WiFi:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to configure WiFi" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private getEnvVariables(): Response {
        try {
            const variables = envService.getEnvVariables();
            return new Response(JSON.stringify(variables), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error getting environment variables:", error);
            return new Response(JSON.stringify({ error: "Failed to get environment variables" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async updateEnvVariables(request: Request): Promise<Response> {
        try {
            const body = await request.json();
            const { variables } = body;

            if (!Array.isArray(variables)) {
                return new Response(JSON.stringify({ success: false, message: "Invalid request format" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const result = await envService.updateEnvVariables(variables);
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error updating environment variables:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to update environment variables" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async rebootDevice(): Promise<Response> {
        try {
            // Schedule reboot after a short delay
            setTimeout(async () => {
                try {
                    await envService.rebootDevice();
                } catch (error) {
                    console.error("Failed to reboot:", error);
                }
            }, 3000);

            return new Response(JSON.stringify({ success: true, message: "Device will reboot in 3 seconds" }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error scheduling reboot:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to schedule reboot" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private getControlStatus(): Response {
        try {
            const appInfo = controlService.getCurrentAppInfo();
            return new Response(JSON.stringify(appInfo), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error getting control status:", error);
            return new Response(JSON.stringify({ error: "Failed to get control status" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async triggerSinglePress(): Promise<Response> {
        try {
            const result = await controlService.triggerSinglePress();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error triggering single press:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to trigger single press" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async triggerDoublePress(): Promise<Response> {
        try {
            const result = await controlService.triggerDoublePress();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error triggering double press:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to trigger double press" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async triggerTriplePress(): Promise<Response> {
        try {
            const result = await controlService.triggerTriplePress();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error triggering triple press:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to trigger triple press" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async triggerLongPress(): Promise<Response> {
        try {
            const result = await controlService.triggerLongPress();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error triggering long press:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to trigger long press" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async triggerRotateLeft(): Promise<Response> {
        try {
            const result = await controlService.triggerRotateLeft();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error triggering rotate left:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to trigger rotate left" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async triggerRotateRight(): Promise<Response> {
        try {
            const result = await controlService.triggerRotateRight();
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error triggering rotate right:", error);
            return new Response(JSON.stringify({ success: false, message: "Failed to trigger rotate right" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    public getEnabledApps(): string[] {
        return configManager.getEnabledApps();
    }
}
