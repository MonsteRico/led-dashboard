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
 * Executes the update using the direct update script
 */
export async function executeUpdateAfterShutdown(version: string, scriptsDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const updateScript = join(scriptsDir, "update-direct.sh");

        console.log(`Executing direct update script: ${updateScript} with version: ${version}`);
        console.log("Update logs will be written to /var/log/led-dashboard-update.log");

        // Use the direct update script which provides better logging
        const child = spawn("bash", [updateScript, version], {
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
            console.log("Update script output:", data.toString());
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
            console.error("Update script error:", data.toString());
        });

        child.on("close", (code) => {
            if (code === 0) {
                console.log("Update script completed successfully");
                console.log("Check /var/log/led-dashboard-update.log for detailed update logs");
                resolve();
            } else {
                console.error(`Update script failed with code ${code}`);
                console.error("Check /var/log/led-dashboard-update.log for detailed error logs");
                reject(new Error(`Update script failed with code ${code}: ${stderr}`));
            }
        });

        child.on("error", (error) => {
            console.error("Failed to execute update script:", error);
            reject(error);
        });
    });
}
