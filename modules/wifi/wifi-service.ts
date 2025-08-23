import { configManager, type NetworkConfig } from "../config/config-manager";

export interface WifiCredentials {
    ssid: string;
    password: string;
}

export class WifiService {
    private static instance: WifiService;

    private constructor() {}

    public static getInstance(): WifiService {
        if (!WifiService.instance) {
            WifiService.instance = new WifiService();
        }
        return WifiService.instance;
    }

    /**
     * Check internet connectivity by pinging a reliable host
     */
    public async checkInternetConnection(): Promise<boolean> {
        try {
            const result = await Bun.$`ping -c 1 -W 5 8.8.8.8`;
            return result.exitCode === 0;
        } catch (error) {
            console.error("Error checking internet connection:", error);
            return false;
        }
    }

    /**
     * Get the local IP address of the device
     */
    public async getLocalIp(): Promise<string> {
        try {
            const result = await Bun.$`hostname -I`;
            const ips = result.stdout.toString().trim().split(/\s+/);
            // Return the first non-localhost IP
            return ips.find((ip) => ip && ip !== "127.0.0.1") || ips[0] || "";
        } catch (error) {
            console.error("Error getting local IP:", error);
            return "";
        }
    }

    /**
     * Get the current WiFi SSID
     */
    public async getCurrentSSID(): Promise<string> {
        try {
            const result = await Bun.$`iw dev wlan0 link | sed -n 's/.*SSID: \(.*\)/\1/p'`
            return result.stdout.toString().trim();
        } catch (error) {
            console.error("Error getting current SSID:", error);
            return "";
        }
    }

    /**
     * Update network configuration and save to config
     */
    public async updateNetworkStatus(): Promise<NetworkConfig> {
        const hasInternet = await this.checkInternetConnection();
        const localIp = await this.getLocalIp();
        const currentSSID = await this.getCurrentSSID();

        const networkConfig: NetworkConfig = {
            hasInternet,
            localIp,
            currentSSID,
            lastChecked: new Date().toISOString(),
        };

        await configManager.updateNetworkConfig(networkConfig);
        return networkConfig;
    }

    /**
     * Configure WiFi with provided credentials
     */
    public async configureWifi(credentials: WifiCredentials): Promise<{ success: boolean; message: string }> {
        try {
            // Create wpa_supplicant configuration
            const wpaConfig = `network={
    ssid="${credentials.ssid}"
    psk="${credentials.password}"
    key_mgmt=WPA-PSK
}`;

            // Write to wpa_supplicant.conf
            await Bun.write("/etc/wpa_supplicant/wpa_supplicant.conf", wpaConfig);

            // Restart networking services
            await Bun.$`systemctl restart wpa_supplicant`;
            await Bun.$`systemctl restart networking`;

            // Wait a moment for connection to establish
            await new Promise((resolve) => setTimeout(resolve, 30000));

            // Update network status
            await this.updateNetworkStatus();

            return { success: true, message: "WiFi configured successfully" };
        } catch (error) {
            console.error("Error configuring WiFi:", error);
            return { success: false, message: `Failed to configure WiFi: ${error}` };
        }
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

    /**
     * Configure WiFi and reboot device
     */
    public async configureWifiAndReboot(credentials: WifiCredentials): Promise<{ success: boolean; message: string }> {
        try {
            const result = await this.configureWifi(credentials);
            if (result.success) {
                // Schedule reboot after a short delay
                setTimeout(async () => {
                    try {
                        await this.rebootDevice();
                    } catch (error) {
                        console.error("Failed to reboot:", error);
                    }
                }, 3000);

                return { success: true, message: "WiFi configured successfully. Device will reboot in 3 seconds." };
            } else {
                return result;
            }
        } catch (error) {
            console.error("Error in configureWifiAndReboot:", error);
            return { success: false, message: `Failed to configure WiFi and reboot: ${error}` };
        }
    }
}

export const wifiService = WifiService.getInstance();
