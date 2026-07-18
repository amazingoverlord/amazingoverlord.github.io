// weather.js - External script for NYC weather

// New York City coordinates
const LAT = 40.7128;
const LON = -74.0060;

// Weather condition mapping
const weatherConditions = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "foggy",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "light rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "light snow",
    73: "moderate snow",
    75: "heavy snow",
    95: "thunderstorm"
};

async function getWeather() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=temperature_2m,apparent_temperature&timezone=America/New_York`;
        const response = await fetch(url);
        const data = await response.json();
        
        const temp = Math.round(data.current_weather.temperature);
        const windSpeed = data.current_weather.windspeed;
        const weatherCode = data.current_weather.weathercode;
        const condition = weatherConditions[weatherCode] || "unknown conditions";
        
        const currentHour = new Date().getHours();
        const feelsLike = Math.round(data.hourly.apparent_temperature[currentHour]);
        
        const weatherText = `The current weather in New York City is ${condition} with a temperature of ${temp}°C. It feels like ${feelsLike}°C. Wind speed is ${windSpeed} km/h.`;
        
        const weatherDiv = document.getElementById('weather');
        if (weatherDiv) {
            weatherDiv.textContent = weatherText;
        }
        
    } catch (error) {
        const weatherDiv = document.getElementById('weather');
        if (weatherDiv) {
            weatherDiv.innerHTML = '<span class="error">Unable to load weather data. Please try again later.</span>';
        }
        console.error('Error:', error);
    }
}

// Auto-execute when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', getWeather);
} else {
    getWeather();
}