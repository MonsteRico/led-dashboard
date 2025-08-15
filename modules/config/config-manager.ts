import { readFileSync, writeFileSync, existsSync } from "fs";

export interface AppConfig {
    name: string;
    enabled: boolean;
    className: string;
}

export interface ConfigData {
    apps: AppConfig[];
    currentApp: number;
}

const CONFIG_FILE = "config.json";

// Default config will be populated by app registry
const DEFAULT_CONFIG: ConfigData = {
    apps: [],
    currentApp: 0,
};

class ConfigManager {
    private config: ConfigData;
    private static instance: ConfigManager;

    private constructor() {
        this.config = this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private loadConfig(): ConfigData {
        if (existsSync(CONFIG_FILE)) {
            try {
                const data = readFileSync(CONFIG_FILE, "utf-8");
                const loadedConfig = JSON.parse(data);

                return {
                    apps: loadedConfig.apps || [],
                    currentApp: loadedConfig.currentApp || 0,
                };
            } catch (error) {
                console.error("Error loading config:", error);
                return DEFAULT_CONFIG;
            }
        }
        return DEFAULT_CONFIG;
    }

    public saveConfig(): void {
        try {
            writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error("Error saving config:", error);
        }
    }

    public getConfig(): ConfigData {
        return this.config;
    }

    public updateApps(apps: AppConfig[]): void {
        this.config.apps = apps;
        this.config.currentApp = 0; // Reset to first app
        this.saveConfig();
    }

    public getEnabledApps(): string[] {
        return this.config.apps.filter((app) => app.enabled).map((app) => app.className);
    }

    public getAvailableApps(): AppConfig[] {
        return this.config.apps;
    }

    public addNewApp(appConfig: AppConfig): void {
        // Check if app already exists in current config
        const existingIndex = this.config.apps.findIndex((app) => app.className === appConfig.className);
        if (existingIndex === -1) {
            this.config.apps.push(appConfig);
            this.saveConfig();
        }
    }

    public reloadConfig(): void {
        this.config = this.loadConfig();
    }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
