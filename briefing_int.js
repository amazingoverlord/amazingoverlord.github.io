// briefing.js - Location-Aware Morning Briefing with Smart Suggestions

let userLat = null;
let userLon = null;
let userCity = "your location";

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
    56: "freezing drizzle",
    57: "freezing drizzle",
    61: "light rain",
    63: "moderate rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "freezing rain",
    71: "light snow",
    73: "moderate snow",
    75: "heavy snow",
    77: "snow grains",
    80: "light rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    85: "light snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "thunderstorm with hail"
};

function getGreeting(hour) {
    if (hour >= 5 && hour < 12) {
        return "Good morning";
    } else if (hour >= 12 && hour < 17) {
        return "Good afternoon";
    } else if (hour >= 17 && hour < 21) {
        return "Good evening";
    } else {
        return "Good night";
    }
}

function getClosing(hour) {
    if (hour >= 5 && hour < 12) {
        return "Have a great day ahead";
    } else if (hour >= 12 && hour < 17) {
        return "Enjoy the rest of your afternoon";
    } else if (hour >= 17 && hour < 21) {
        return "Have a pleasant evening";
    } else {
        return "Have a restful night";
    }
}

function celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
}

function kmhToMph(kmh) {
    return Math.round(kmh * 0.621371);
}

function kmhToKnots(kmh) {
    return Math.round(kmh * 0.539957);
}

function getWardrobeSuggestion(temp, feelsLike, weatherCode, uvIndex) {
    const effectiveTemp = feelsLike || temp;
    let suggestions = [];
    
    // Temperature-based clothing suggestions
    if (effectiveTemp <= -10) {
        suggestions.push("You should wear a heavy winter coat with thermal layers, a scarf, gloves, and a hat");
    } else if (effectiveTemp <= 0) {
        suggestions.push("You need a heavy winter coat with a warm sweater underneath, plus a scarf and insulated boots");
    } else if (effectiveTemp <= 5) {
        suggestions.push("A heavy coat with a sweater underneath will keep you warm");
    } else if (effectiveTemp <= 10) {
        suggestions.push("You should wear a warm jacket and consider layering a sweater for extra warmth");
    } else if (effectiveTemp <= 15) {
        suggestions.push("A light jacket or a sweater should be comfortable");
    } else if (effectiveTemp <= 20) {
        suggestions.push("A light jacket or a long sleeve shirt works well");
    } else if (effectiveTemp <= 25) {
        suggestions.push("Short sleeves or a light shirt are perfect");
    } else if (effectiveTemp <= 30) {
        suggestions.push("You should wear breathable fabrics like cotton or linen");
    } else {
        suggestions.push("Wear light clothing and a hat, and be sure to drink plenty of water");
    }
    
    // Rain check for umbrella
    const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
    if (rainCodes.includes(weatherCode)) {
        suggestions.push("Bring an umbrella because rain is expected");
    }
    
    // Snow check
    const snowCodes = [71, 73, 75, 77, 85, 86];
    if (snowCodes.includes(weatherCode)) {
        suggestions.push("Wear waterproof boots and be careful on slippery surfaces");
    }
    
    // Thunderstorm check
    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
        suggestions.push("Stay indoors if possible and avoid open areas");
    }
    
    // High UV index check
    if (uvIndex >= 3 && uvIndex <= 5) {
        suggestions.push("Consider wearing sunscreen as the UV index is moderate");
    } else if (uvIndex >= 6 && uvIndex <= 7) {
        suggestions.push("Apply SPF 30 or higher sunscreen and wear a hat because the UV index is high");
    } else if (uvIndex >= 8 && uvIndex <= 10) {
        suggestions.push("Use SPF 50 sunscreen, wear a wide-brimmed hat, and limit sun exposure between 10am and 4pm");
    } else if (uvIndex >= 11) {
        suggestions.push("Extreme UV levels! Stay in the shade, use maximum SPF sunscreen, and cover up completely");
    }
    
    // Combine suggestions with proper formatting
    if (suggestions.length === 1) {
        return suggestions[0];
    } else if (suggestions.length === 2) {
        return `${suggestions[0]}. Also, ${suggestions[1].toLowerCase()}`;
    } else {
        const lastSuggestion = suggestions.pop();
        const firstSuggestions = suggestions.join('. ');
        return `${firstSuggestions}. Also, ${lastSuggestion.toLowerCase()}`;
    }
}

function updateTimeAndDate() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes < 10 ? '0' + minutes : minutes;
    const timeString = `${hour12}:${minuteStr}${ampm}`;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    return { timeString, dateString, hours };
}

async function getUVIndex(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=uv_index_max&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.daily && data.daily.uv_index_max && data.daily.uv_index_max.length > 0) {
            return Math.round(data.daily.uv_index_max[0]);
        }
        return 0;
    } catch (error) {
        console.error('UV index error:', error);
        return 0;
    }
}

async function getLocationName(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.hamlet;
            const state = data.address.state;
            if (city && state) {
                return `${city}, ${state}`;
            } else if (city) {
                return city;
            }
        }
        return "your location";
    } catch (error) {
        console.error('Location name error:', error);
        return "your location";
    }
}

async function getWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,precipitation_probability&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        
        const temp = Math.round(data.current_weather.temperature);
        const windSpeed = data.current_weather.windspeed;
        const weatherCode = data.current_weather.weathercode;
        const condition = weatherConditions[weatherCode] || "unknown conditions";
        
        const currentHour = new Date().getHours();
        const feelsLike = Math.round(data.hourly.apparent_temperature[currentHour]);
        
        return { temp, condition, windSpeed, feelsLike, weatherCode };
    } catch (error) {
        console.error('Weather error:', error);
        return null;
    }
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

async function generateBriefing() {
    const { timeString, dateString, hours } = updateTimeAndDate();
    const greeting = getGreeting(hours);
    const closing = getClosing(hours);
    
    let briefingParagraph = '';
    
    // Try to get user location
    try {
        const position = await getUserLocation();
        userLat = position.coords.latitude;
        userLon = position.coords.longitude;
        userCity = await getLocationName(userLat, userLon);
        
        const weather = await getWeather(userLat, userLon);
        
        if (weather) {
            const uvIndex = await getUVIndex(userLat, userLon);
            const suggestion = getWardrobeSuggestion(weather.temp, weather.feelsLike, weather.weatherCode, uvIndex);
            const tempF = celsiusToFahrenheit(weather.temp);
            const feelsLikeF = celsiusToFahrenheit(weather.feelsLike);
            const windMph = kmhToMph(weather.windSpeed);
            const windKnots = kmhToKnots(weather.windSpeed);
            
            briefingParagraph = `${greeting}. It is ${timeString} on ${dateString} in ${userCity}. ` +
                               `The weather outside is ${weather.condition} with a temperature of ${weather.temp}°C (${tempF}°F), ` +
                               `though it feels like ${weather.feelsLike}°C (${feelsLikeF}°F). The wind is blowing at ${weather.windSpeed} kilometers per hour (${windMph} mph, ${windKnots} knots). ` +
                               `${suggestion}. ${closing}.`;
        } else {
            briefingParagraph = `${greeting}. It is ${timeString} on ${dateString}. ` +
                               `Weather data is currently unavailable for your location. Please check your internet connection. ${closing}.`;
        }
        
    } catch (error) {
        console.error('Location error:', error);
        // Fallback to NYC if location is denied or fails
        const fallbackLat = 40.7128;
        const fallbackLon = -74.0060;
        userCity = "New York City";
        
        const weather = await getWeather(fallbackLat, fallbackLon);
        
        if (weather) {
            const uvIndex = await getUVIndex(fallbackLat, fallbackLon);
            const suggestion = getWardrobeSuggestion(weather.temp, weather.feelsLike, weather.weatherCode, uvIndex);
            const tempF = celsiusToFahrenheit(weather.temp);
            const feelsLikeF = celsiusToFahrenheit(weather.feelsLike);
            const windMph = kmhToMph(weather.windSpeed);
            const windKnots = kmhToKnots(weather.windSpeed);
            
            briefingParagraph = `${greeting}. It is ${timeString} on ${dateString} in ${userCity} (using default location because location access was denied). ` +
                               `The weather outside is ${weather.condition} with a temperature of ${weather.temp}°C (${tempF}°F), ` +
                               `though it feels like ${weather.feelsLike}°C (${feelsLikeF}°F). The wind is blowing at ${weather.windSpeed} kilometers per hour (${windMph} mph, ${windKnots} knots). ` +
                               `${suggestion}. ${closing}.`;
        } else {
            briefingParagraph = `${greeting}. It is ${timeString} on ${dateString}. ` +
                               `Unable to load weather data. Please check your internet connection and try again. ${closing}.`;
        }
    }
    
    document.getElementById('briefing').textContent = briefingParagraph;
}

// Initial load
generateBriefing();

// Update weather every 10 minutes, but don't refresh location (stays with initial location)
setInterval(generateBriefing, 600000);