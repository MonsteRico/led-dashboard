import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { SpotifyIntegration } from "@/modules/spotify/spotify-integration";
import { configManager } from "@/modules/config/config-manager";

export class WebServer {
    private port: number;
    private spotifyIntegration: SpotifyIntegration | null;

    constructor(port: number = 3000) {
        this.port = port;
        try {
            this.spotifyIntegration = new SpotifyIntegration();
        } catch (error) {
            console.warn("Spotify integration not available:", (error as Error).message);
            this.spotifyIntegration = null;
        }
    }

    public start(): void {
        console.log(`Starting web server on port ${this.port}`);

        serve({
            port: this.port,
            fetch: this.handleRequest.bind(this),
        });
    }

    private async handleRequest(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            switch (path) {
                case "/":
                    return this.serveHtmlFile("index.html");

                case "/static/styles.css":
                    return this.serveStaticFile("styles.css", "text/css");

                case "/static/script.js":
                    return this.serveStaticFile("script.js", "application/javascript");

                case "/api/config":
                    if (request.method === "GET") {
                        return this.getConfig();
                    } else if (request.method === "POST") {
                        return await this.updateConfig(request);
                    }
                    break;

                case "/spotify/login":
                    return this.handleSpotifyLogin();
                case "/spotify/callback":
                    return await this.handleSpotifyCallback(request);

                default:
                    return new Response("Not Found", { status: 404 });
            }
        } catch (error) {
            console.error("Error handling request:", error);
            return new Response("Internal Server Error", { status: 500 });
        }

        return new Response("Method Not Allowed", { status: 405 });
    }

    private serveHtmlFile(filename: string): Response {
        try {
            const filePath = join(__dirname, "templates", filename);
            if (existsSync(filePath)) {
                const content = readFileSync(filePath, "utf-8");
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

    private serveStaticFile(filename: string, contentType: string): Response {
        try {
            const filePath = join(__dirname, "templates", filename);
            if (existsSync(filePath)) {
                const content = readFileSync(filePath, "utf-8");
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
            configManager.updateApps(body.apps);

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

    public getEnabledApps(): string[] {
        return configManager.getEnabledApps();
    }
}
