export interface AppConfig {
    name: string;
    enabled: boolean;
    className: string;
}

export interface NetworkConfig {
    hasInternet: boolean;
    localIp: string;
    currentSSID: string;
    lastChecked: string;
}

export interface ConfigData {
    apps: AppConfig[];
    currentApp: number;
    network: NetworkConfig;
}

const CONFIG_FILE = "config.json";

// Default config will be populated by app registry
const DEFAULT_CONFIG: ConfigData = {
    apps: [],
    currentApp: 0,
    network: {
        hasInternet: false,
        localIp: "",
        currentSSID: "",
        lastChecked: new Date().toISOString(),
    },
};

class ConfigManager {
    private config: ConfigData;
    private static instance: ConfigManager;

    private constructor() {
        this.config = DEFAULT_CONFIG;
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private async loadConfig(): Promise<ConfigData> {
        try {
            const file = Bun.file(CONFIG_FILE);
            if (await file.exists()) {
                const data = await file.text();
                const loadedConfig = JSON.parse(data);

                return {
                    apps: loadedConfig.apps || [],
                    currentApp: loadedConfig.currentApp || 0,
                    network: loadedConfig.network || DEFAULT_CONFIG.network,
                };
            }
        } catch (error) {
            console.error("Error loading config:", error);
        }
        return DEFAULT_CONFIG;
    }

    public async saveConfig(): Promise<void> {
        try {
            await Bun.write(CONFIG_FILE, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error("Error saving config:", error);
        }
    }

    public getConfig(): ConfigData {
        return this.config;
    }

    public async updateApps(apps: AppConfig[]): Promise<void> {
        this.config.apps = apps;
        this.config.currentApp = 0; // Reset to first app
        await this.saveConfig();
    }

    public getEnabledApps(): string[] {
        return this.config.apps.filter((app) => app.enabled).map((app) => app.className);
    }

    public getAvailableApps(): AppConfig[] {
        return this.config.apps;
    }

    public async addNewApp(appConfig: AppConfig): Promise<void> {
        // Check if app already exists in current config
        const existingIndex = this.config.apps.findIndex((app) => app.className === appConfig.className);
        if (existingIndex === -1) {
            this.config.apps.push(appConfig);
            await this.saveConfig();
        }
    }

    public async updateNetworkConfig(networkConfig: Partial<NetworkConfig>): Promise<void> {
        this.config.network = { ...this.config.network, ...networkConfig };
        await this.saveConfig();
    }

    public getNetworkConfig(): NetworkConfig {
        return this.config.network;
    }

    public async reloadConfig(): Promise<void> {
        this.config = await this.loadConfig();
    }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
