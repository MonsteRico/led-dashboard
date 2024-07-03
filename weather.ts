export async function getWeatherData(): Promise<any> {
    const params = {
        latitude: 39.9835,
        longitude: -86.0455,
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
        temperature_unit: "fahrenheit",
        wind_speed_unit: "ms",
        precipitation_unit: "inch",
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    // Helper function to form time ranges
    const range = (start: number, stop: number, step: number) => Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    // Process first location. Add a for-loop for multiple locations or weather models
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
    const weatherData = {
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

    return weatherData;
}

export type WeatherData = {
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
};

import weatherCodeJSON from "./weatherCodeMap.json";
import { fetchWeatherApi } from "openmeteo";
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
export function getWeatherCodeIcon(weatherCode: number): string | null {
    try {
        const image = weatherCodeMap[weatherCode].day.image;
        return image;
    } catch (e) {
        return null;
    }
}
