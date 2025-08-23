import { Bun } from "bun";

export interface EnvVariable {
    name: string;
    value: string;
    description?: string;
    isHidden: boolean;
    isRequired: boolean;
    validation?: {
        type: "string" | "boolean" | "url";
        maxLength?: number;
        allowedValues?: string[];
    };
}

export interface EnvConfig {
    variables: EnvVariable[];
}

export class EnvService {
    private static instance: EnvService;
    private envFile = ".env";
    private envConfig: EnvConfig;

    private constructor() {
        this.envConfig = this.initializeEnvConfig();
    }

    public static getInstance(): EnvService {
        if (!EnvService.instance) {
            EnvService.instance = new EnvService();
        }
        return EnvService.instance;
    }

    private initializeEnvConfig(): EnvConfig {
        return {
            variables: [
                {
                    name: "LED_DASHBOARD_WEB_KEY",
                    value: process.env.LED_DASHBOARD_WEB_KEY || "",
                    description: "API key for LED dashboard web service",
                    isHidden: true,
                    isRequired: false,
                    validation: {
                        type: "string",
                        maxLength: 128,
                    },
                },
                {
                    name: "USE_HTTPS",
                    value: process.env.USE_HTTPS || "false",
                    description: "Enable HTTPS for the web server",
                    isHidden: false,
                    isRequired: false,
                    validation: {
                        type: "boolean",
                        allowedValues: ["true", "false"],
                    },
                },
                {
                    name: "SPOTIFY_CLIENT_ID",
                    value: process.env.SPOTIFY_CLIENT_ID || "",
                    description: "Spotify API Client ID",
                    isHidden: true,
                    isRequired: false,
                    validation: {
                        type: "string",
                    },
                },
                {
                    name: "SPOTIFY_CLIENT_SECRET",
                    value: process.env.SPOTIFY_CLIENT_SECRET || "",
                    description: "Spotify API Client Secret",
                    isHidden: true,
                    isRequired: false,
                    validation: {
                        type: "string",
                    },
                },
                {
                    name: "SPOTIFY_REDIRECT_URI",
                    value: process.env.SPOTIFY_REDIRECT_URI || "",
                    description: "This should be set to `https://{your devices local ip}:3000/api/spotify/callback`",
                    isHidden: false,
                    isRequired: false,
                    validation: {
                        type: "url",
                    },
                },
            ],
        };
    }

    /**
     * Get all environment variables with their current values
     */
    public getEnvVariables(): EnvVariable[] {
        return this.envConfig.variables.map((variable) => ({
            ...variable,
            value: process.env[variable.name] || variable.value,
        }));
    }

    /**
     * Update environment variables and save to .env file
     */
    public async updateEnvVariables(
        updates: { name: string; value: string }[],
    ): Promise<{ success: boolean; message: string; errors?: string[] }> {
        const errors: string[] = [];
        const validUpdates: { name: string; value: string }[] = [];

        // Validate updates
        for (const update of updates) {
            const variable = this.envConfig.variables.find((v) => v.name === update.name);
            if (!variable) {
                errors.push(`Unknown environment variable: ${update.name}`);
                continue;
            }

            const validationResult = this.validateVariable(variable, update.value);
            if (!validationResult.valid) {
                errors.push(`${update.name}: ${validationResult.error}`);
                continue;
            }

            validUpdates.push(update);
        }

        if (errors.length > 0) {
            return { success: false, message: "Validation failed", errors };
        }

        try {
            // Read existing .env file
            let envContent = "";
            try {
                const envFile = Bun.file(this.envFile);
                if (await envFile.exists()) {
                    envContent = await envFile.text();
                }
            } catch (error) {
                console.warn("Could not read existing .env file:", error);
            }

            // Parse existing variables
            const existingVars = new Map<string, string>();
            const lines = envContent.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#")) {
                    const equalIndex = trimmed.indexOf("=");
                    if (equalIndex > 0) {
                        const name = trimmed.substring(0, equalIndex);
                        const value = trimmed.substring(equalIndex + 1);
                        existingVars.set(name, value);
                    }
                }
            }

            // Update with new values
            for (const update of validUpdates) {
                existingVars.set(update.name, update.value);
            }

            // Write back to .env file
            const newEnvContent =
                Array.from(existingVars.entries())
                    .map(([name, value]) => `${name}=${value}`)
                    .join("\n") + "\n";

            await Bun.write(this.envFile, newEnvContent);

            return { success: true, message: "Environment variables updated successfully" };
        } catch (error) {
            console.error("Error updating environment variables:", error);
            return { success: false, message: `Failed to update environment variables: ${error}` };
        }
    }

    /**
     * Validate a single environment variable
     */
    private validateVariable(variable: EnvVariable, value: string): { valid: boolean; error?: string } {
        if (variable.validation) {
            const validation = variable.validation;

            // Check max length
            if (validation.maxLength && value.length > validation.maxLength) {
                return { valid: false, error: `Value exceeds maximum length of ${validation.maxLength} characters` };
            }

            // Check allowed values for boolean/enum types
            if (validation.allowedValues && !validation.allowedValues.includes(value)) {
                return { valid: false, error: `Value must be one of: ${validation.allowedValues.join(", ")}` };
            }

            // Check URL format
            if (validation.type === "url" && value) {
                try {
                    new URL(value);
                } catch {
                    return { valid: false, error: "Invalid URL format" };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Check if required environment variables are set for specific apps
     */
    public checkAppRequirements(): { [appName: string]: { enabled: boolean; missingVars: string[] } } {
        const requirements: { [appName: string]: { enabled: boolean; missingVars: string[] } } = {
            spotify: { enabled: true, missingVars: [] },
            canvas: { enabled: true, missingVars: [] },
        };

        // Check Spotify requirements
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            requirements.spotify.enabled = false;
            if (!process.env.SPOTIFY_CLIENT_ID) requirements.spotify.missingVars.push("SPOTIFY_CLIENT_ID");
            if (!process.env.SPOTIFY_CLIENT_SECRET) requirements.spotify.missingVars.push("SPOTIFY_CLIENT_SECRET");
        }

        // Check Canvas requirements
        if (!process.env.LED_DASHBOARD_WEB_KEY) {
            requirements.canvas.enabled = false;
            requirements.canvas.missingVars.push("LED_DASHBOARD_WEB_KEY");
        }

        return requirements;
    }

    /**
     * Reboot the device
     */
    public async rebootDevice(): Promise<void> {
        try {
            await Bun.$`reboot`;
        } catch (error) {
            console.error("Error rebooting device:", error);
            throw error;
        }
    }
}

export const envService = EnvService.getInstance();
