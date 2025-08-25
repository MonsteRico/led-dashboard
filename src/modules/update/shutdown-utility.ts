import { spawn } from "child_process";
import { join } from "path";

export interface ShutdownOptions {
    apps: any[];
    matrix?: any;
    webServer?: any;
}

/**
 * Gracefully shuts down the LED dashboard components
 */
export async function gracefulShutdown(options: ShutdownOptions): Promise<void> {
    console.log("Starting graceful shutdown for update...");

    try {
        // 1. Stop all apps
        console.log("Stopping all apps...");
        for (const app of options.apps) {
            if (app.backgroundInterval) {
                clearInterval(app.backgroundInterval);
                app.backgroundInterval = null;
            }
            if (app.onExit) {
                await app.onExit();
            }
        }

        // 2. Clear the matrix if available
        if (options.matrix) {
            console.log("Clearing LED matrix...");
            try {
                options.matrix.clear().sync();
            } catch (error) {
                console.warn("Error clearing matrix:", error);
            }
        }

        console.log("Graceful shutdown completed successfully");
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        // Continue with shutdown even if there are errors
    }
}

/**
 * Executes the update using systemd service trigger
 */
export async function executeUpdateAfterShutdown(version: string, scriptsDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Triggering update service for version: ${version}`);
        console.log("Update logs will be available in systemd journal");
        console.log("Use 'journalctl -u update@${version}.service -f' to monitor the update");

        // Use systemctl to start the update service
        const child = spawn("systemctl", ["start", `update@${version}.service`], {
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
            console.log("Update service output:", data.toString());
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
            console.error("Update service error:", data.toString());
        });

        child.on("close", (code) => {
            if (code === 0) {
                console.log("Update service started successfully");
                console.log("The update service will handle stopping the dashboard, updating, and restarting");
                resolve();
            } else {
                console.error(`Failed to start update service with code ${code}`);
                console.error("Check systemd logs for details");
                reject(new Error(`Failed to start update service with code ${code}: ${stderr}`));
            }
        });

        child.on("error", (error) => {
            console.error("Failed to trigger update service:", error);
            reject(error);
        });
    });
}
