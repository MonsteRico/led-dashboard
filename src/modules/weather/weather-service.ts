import { fetchWeatherApi } from "openmeteo";
import weatherCodeJSON from "./weatherCodeMap.json";

export interface WeatherData {
    current: {
        time: Date;
        temperature2m: number;
        apparentTemperature: number;
        isDay: number;
        precipitation: number;
        rain: number;
        showers: number;
        snowfall: number;
        weatherCode: number;
        cloudCover: number;
    };
    daily: {
        time: Date[];
        sunrise: Float32Array;
        sunset: Float32Array;
    };
}

export interface WeatherConfig {
    latitude: number;
    longitude: number;
    refreshInterval: number;
    temperatureUnit: "fahrenheit" | "celsius";
    windSpeedUnit: "ms" | "mph" | "kmh";
    precipitationUnit: "inch" | "mm";
}

const weatherCodeMap = weatherCodeJSON as {
    [weatherCode: string]: {
        day: {
            description: string;
            image: string;
        };
        night: {
            description: string;
            image: string;
        };
    };
};

export class WeatherService {
    private static instance: WeatherService;
    private config: WeatherConfig;
    private cachedData: WeatherData | null = null;
    private lastFetchTime: number = 0;
    private refreshInterval: NodeJS.Timeout | null = null;
    private initialized: boolean = false;

    private constructor() {
        this.config = {
            latitude: 39.9835, // Indianapolis
            longitude: -86.0455,
            refreshInterval: 5 * 60 * 1000, // 5 minutes
            temperatureUnit: "fahrenheit",
            windSpeedUnit: "ms",
            precipitationUnit: "inch",
        };
    }

    public static getInstance(): WeatherService {
        if (!WeatherService.instance) {
            WeatherService.instance = new WeatherService();
        }
        return WeatherService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Fetch initial weather data
            await this.getWeatherData();
            console.log("Weather service initialized successfully");
            this.initialized = true;
        } catch (error) {
            console.error("Failed to initialize weather service:", error);
        }
    }

    public configure(config: Partial<WeatherConfig>): void {
        this.config = { ...this.config, ...config };

        // Restart refresh interval if it exists
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.config.refreshInterval > 0) {
            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, this.config.refreshInterval);
        }
    }

    public getConfig(): WeatherConfig {
        return { ...this.config };
    }

    public async getWeatherData(forceRefresh: boolean = false): Promise<WeatherData> {
        const now = Date.now();
        const cacheAge = now - this.lastFetchTime;

        // Return cached data if it's fresh enough and not forcing refresh
        if (!forceRefresh && this.cachedData && cacheAge < this.config.refreshInterval) {
            return this.cachedData;
        }

        return await this.refreshData();
    }

    public async refreshData(): Promise<WeatherData> {
        try {
            const params = {
                latitude: this.config.latitude,
                longitude: this.config.longitude,
                current: [
                    "temperature_2m",
                    "apparent_temperature",
                    "is_day",
                    "precipitation",
                    "rain",
                    "showers",
                    "snowfall",
                    "weather_code",
                    "cloud_cover",
                ],
                daily: ["sunrise", "sunset"],
                temperature_unit: this.config.temperatureUnit,
                wind_speed_unit: this.config.windSpeedUnit,
                precipitation_unit: this.config.precipitationUnit,
            };

            const url = "https://api.open-meteo.com/v1/forecast";
            const responses = await fetchWeatherApi(url, params);

            // Helper function to form time ranges
            const range = (start: number, stop: number, step: number) =>
                Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

            // Process first location
            const response = responses[0];

            // Attributes for timezone and location
            const utcOffsetSeconds = response.utcOffsetSeconds();
            const timezone = response.timezone();
            const timezoneAbbreviation = response.timezoneAbbreviation();
            const latitude = response.latitude();
            const longitude = response.longitude();

            const current = response.current()!;
            const daily = response.daily()!;

            // Note: The order of weather variables in the URL query and the indices below need to match!
            const weatherData: WeatherData = {
                current: {
                    time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
                    temperature2m: current.variables(0)!.value(),
                    apparentTemperature: current.variables(1)!.value(),
                    isDay: current.variables(2)!.value(),
                    precipitation: current.variables(3)!.value(),
                    rain: current.variables(4)!.value(),
                    showers: current.variables(5)!.value(),
                    snowfall: current.variables(6)!.value(),
                    weatherCode: current.variables(7)!.value(),
                    cloudCover: current.variables(8)!.value(),
                },
                daily: {
                    time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
                        (t) => new Date((t + utcOffsetSeconds) * 1000),
                    ),
                    sunrise: daily.variables(0)!.valuesArray()!,
                    sunset: daily.variables(1)!.valuesArray()!,
                },
            };

            this.cachedData = weatherData;
            this.lastFetchTime = Date.now();

            return weatherData;
        } catch (error) {
            console.error("Error fetching weather data:", error);
            if (this.cachedData) {
                return this.cachedData;
            }
            throw error;
        }
    }

    public getWeatherCodeIcon(weatherCode: number, isDay: boolean = true): string | null {
        try {
            const timeOfDay = isDay ? "day" : "night";
            const image = weatherCodeMap[weatherCode.toString()][timeOfDay].image;
            return image;
        } catch (e) {
            return null;
        }
    }

    public getWeatherDescription(weatherCode: number, isDay: boolean = true): string | null {
        try {
            const timeOfDay = isDay ? "day" : "night";
            const description = weatherCodeMap[weatherCode.toString()][timeOfDay].description;
            return description;
        } catch (e) {
            return null;
        }
    }

    public getCurrentWeather(): WeatherData["current"] | null {
        return this.cachedData?.current || null;
    }

    public getDailyWeather(): WeatherData["daily"] | null {
        return this.cachedData?.daily || null;
    }

    public isDataStale(): boolean {
        if (!this.cachedData) return true;
        const now = Date.now();
        return now - this.lastFetchTime >= this.config.refreshInterval;
    }

    public destroy(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Export singleton instance
export const weatherService = WeatherService.getInstance();
