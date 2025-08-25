import { spawn } from "child_process";
import { join } from "path";
import { gracefulShutdown, executeUpdateAfterShutdown } from "./shutdown-utility";

export interface UpdateInfo {
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
}

export interface UpdateResult {
    success: boolean;
    message: string;
    error?: string;
}

export interface AppContext {
    apps: any[];
    matrix?: any;
    webServer?: any;
}

export class UpdateService {
    private scriptsDir: string;
    private appContext: AppContext | null = null;

    constructor() {
        // Determine the scripts directory based on the current working directory
        // In production, this should be /opt/led-dashboard/scripts
        // In development, it's relative to the project root
        const isProduction = process.env.NODE_ENV === "production";
        if (isProduction) {
            this.scriptsDir = "/opt/led-dashboard/scripts";
        } else {
            this.scriptsDir = join(process.cwd(), "scripts");
        }
    }

    /**
     * Set the app context for graceful shutdown
     */
    public setAppContext(context: AppContext): void {
        this.appContext = context;
    }

    /**
     * Check for available updates
     */
    public async checkForUpdates(): Promise<UpdateInfo> {
        return new Promise((resolve, reject) => {
            const checkScript = join(this.scriptsDir, "check-for-updates.sh");

            // Check if the script exists
            const fs = require("fs");
            if (!fs.existsSync(checkScript)) {
                reject(new Error(`Update check script not found at: ${checkScript}`));
                return;
            }

            const child = spawn("bash", [checkScript], {
                stdio: ["pipe", "pipe", "pipe"],
            });

            let stdout = "";
            let stderr = "";

            child.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            child.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            child.on("close", (code) => {
                if (code === 0) {
                    try {
                        const updateInfo = this.parseCheckOutput(stdout);
                        resolve(updateInfo);
                    } catch (error) {
                        reject(new Error(`Failed to parse update check output: ${error}`));
                    }
                } else {
                    reject(new Error(`Update check failed with code ${code}: ${stderr}`));
                }
            });

            child.on("error", (error) => {
                reject(new Error(`Failed to execute update check: ${error.message}`));
            });
        });
    }

    /**
     * Perform an update to the specified version
     */
    public async performUpdate(version: string): Promise<UpdateResult> {
        return new Promise(async (resolve) => {
            try {
                const updateScript = join(this.scriptsDir, "update.sh");

                // Check if the script exists
                const fs = require("fs");
                if (!fs.existsSync(updateScript)) {
                    resolve({
                        success: false,
                        message: "Update script not found",
                        error: `Update script not found at: ${updateScript}`,
                    });
                    return;
                }

                // Check if we have app context for graceful shutdown
                if (!this.appContext) {
                    resolve({
                        success: false,
                        message: "App context not available for graceful shutdown",
                        error: "Cannot perform update without app context",
                    });
                    return;
                }

                console.log("Starting update process...");

                // // 1. Perform graceful shutdown
                // await gracefulShutdown(this.appContext);

                // 2. Execute update script in detached process
                await executeUpdateAfterShutdown(version, this.scriptsDir);

                // 3. Exit the current process
                // The update script will restart the service
                console.log("Update process initiated. Exiting...");

                // Give a small delay to ensure the response is sent
                // setTimeout(() => {
                //     process.exit(0);
                // }, 1000);

                resolve({
                    success: true,
                    message: `Update to version ${version} initiated successfully. The service will restart automatically.`,
                });
            } catch (error) {
                console.error("Error during update process:", error);
                resolve({
                    success: false,
                    message: "Update process failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }

    /**
     * Parse the output from the check-for-updates.sh script
     */
    private parseCheckOutput(output: string): UpdateInfo {
        const lines = output.trim().split("\n");
        let currentVersion = "0.0.0";
        let latestVersion = "0.0.0";
        let updateAvailable = false;

        for (const line of lines) {
            if (line.startsWith("Current version:")) {
                currentVersion = line.split(":")[1]?.trim() || "0.0.0";
            } else if (line.startsWith("Latest version:")) {
                latestVersion = line.split(":")[1]?.trim() || "0.0.0";
            } else if (line.startsWith("update-available:")) {
                updateAvailable = true;
                const version = line.split(":")[1]?.trim();
                if (version) {
                    latestVersion = version;
                }
            }
        }

        return {
            currentVersion,
            latestVersion,
            updateAvailable,
        };
    }
}

// Export singleton instance
export const updateService = new UpdateService();
