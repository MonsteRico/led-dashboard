import type App from "@/apps/app";
import type DevMatrix from "@/DevMatrix";
import { configManager } from "@/modules/config/config-manager";
import { envService } from "@/modules/env/env-service";

export interface AppDefinition {
    name: string;
    className: string;
    enabled: boolean;
    factory: (matrix: DevMatrix) => App;
    requiredEnvVars?: string[];
}

class AppRegistry {
    private static instance: AppRegistry;
    private apps: Map<string, AppDefinition> = new Map();

    private constructor() {}

    public static getInstance(): AppRegistry {
        if (!AppRegistry.instance) {
            AppRegistry.instance = new AppRegistry();
        }
        return AppRegistry.instance;
    }

    public async registerApp(appDef: AppDefinition): Promise<void> {
        this.apps.set(appDef.className, appDef);

        // Check environment variable requirements
        const shouldEnable = await this.checkAppRequirements(appDef);

        // Register with config manager
        await configManager.addNewApp({
            name: appDef.name,
            className: appDef.className,
            enabled: shouldEnable,
        });
    }

    private async checkAppRequirements(appDef: AppDefinition): Promise<boolean> {
        if (!appDef.requiredEnvVars || appDef.requiredEnvVars.length === 0) {
            return appDef.enabled;
        }

        // Check if all required environment variables are set
        for (const envVar of appDef.requiredEnvVars) {
            if (!process.env[envVar]) {
                console.warn(`App ${appDef.name} requires environment variable ${envVar} which is not set. Disabling app.`);
                return false;
            }
        }

        return appDef.enabled;
    }

    public getAppDefinition(className: string): AppDefinition | undefined {
        return this.apps.get(className);
    }

    public getAllAppDefinitions(): AppDefinition[] {
        return Array.from(this.apps.values());
    }

    public createApp(className: string, matrix: DevMatrix): App | null {
        const appDef = this.apps.get(className);
        if (appDef) {
            return appDef.factory(matrix);
        }
        return null;
    }

    public createEnabledApps(matrix: DevMatrix): App[] {
        const enabledAppClasses = configManager.getEnabledApps();
        const apps: App[] = [];

        for (const className of enabledAppClasses) {
            const app = this.createApp(className, matrix);
            if (app) {
                apps.push(app);
            } else {
                console.warn(`Failed to create app: ${className}`);
            }
        }

        return apps;
    }

    public getAvailableApps(): string[] {
        return Array.from(this.apps.keys());
    }

    /**
     * Check and update app status based on environment variable requirements
     */
    public async updateAppStatusBasedOnEnvVars(): Promise<void> {
        const appRequirements = envService.checkAppRequirements();
        const currentConfig = configManager.getConfig();
        let configUpdated = false;

        // Update Spotify app status
        if (appRequirements.spotify.enabled === false) {
            const spotifyApp = currentConfig.apps.find((app) => app.className === "Spotify");
            if (spotifyApp && spotifyApp.enabled) {
                spotifyApp.enabled = false;
                configUpdated = true;
                console.warn("Spotify app disabled due to missing environment variables:", appRequirements.spotify.missingVars);
            }
        }

        // Update Canvas app status
        if (appRequirements.canvas.enabled === false) {
            const canvasApp = currentConfig.apps.find((app) => app.className === "Canvas");
            if (canvasApp && canvasApp.enabled) {
                canvasApp.enabled = false;
                configUpdated = true;
                console.warn("Canvas app disabled due to missing environment variables:", appRequirements.canvas.missingVars);
            }
        }

        if (configUpdated) {
            await configManager.saveConfig();
        }
    }
}

// Export singleton instance
export const appRegistry = AppRegistry.getInstance();
