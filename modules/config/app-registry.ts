import type App from "@/apps/app";
import type DevMatrix from "@/DevMatrix";
import { configManager } from "@/modules/config/config-manager";

export interface AppDefinition {
    name: string;
    className: string;
    enabled: boolean;
    factory: (matrix: DevMatrix) => App;
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

        // Also register with config manager
        await configManager.addNewApp({
            name: appDef.name,
            className: appDef.className,
            enabled: appDef.enabled,
        });
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
}

// Export singleton instance
export const appRegistry = AppRegistry.getInstance();
