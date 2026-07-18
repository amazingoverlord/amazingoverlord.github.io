// briefing.js - Morning Briefing with Weather and Wardrobe

let userLat = null;
let userLon = null;
let userCity = "your location";

const weatherConditions = {
  0:"The sky is clear",
  1:"The sky is mainly clear",
  2:"It's partly cloudy",
  3:"It's overcast",
  45:"Fog has settled in",
  48:"It's foggy out there",
  51:"A light drizzle is falling",
  53:"It's drizzling lightly",
  55:"It's drizzling",
  61:"Light rain is falling",
  63:"It's raining",
  65:"Heavy rain is coming down",
  71:"A light snow is falling",
  73:"It's snowing",
  75:"Heavy snow is coming down",
  77:"Snowy grains are falling",
  80:"Rain showers are passing through",
  81:"Showers are falling",
  82:"Heavy showers are coming down",
  85:"Snow showers are passing through",
  86:"Heavy snows are blowing through",
  95:"Thunderstorms are blowing",
  96:"Thunderstorms with hail are moving in",
  99:"Severe thunderstorms are approaching"
};

async function getSunriseSunset(lat, lon, date) {
    // Open-Meteo provides sunrise/sunset times in the daily API
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.daily && data.daily.sunrise && data.daily.sunrise.length > 0) {
            // Get today's sunrise and sunset
            const sunriseUTC = new Date(data.daily.sunrise[0]);
            const sunsetUTC = new Date(data.daily.sunset[0]);
            
            // Convert to local time
            const sunriseHour = sunriseUTC.getHours() + sunriseUTC.getMinutes() / 60;
            const sunsetHour = sunsetUTC.getHours() + sunsetUTC.getMinutes() / 60;
            
            return { sunrise: sunriseHour, sunset: sunsetHour };
        }
    } catch (error) {
        console.error('Sunrise/sunset API error:', error);
    }
    
    // Fallback to approximate times based on season
    const month = date.getMonth();
    let sunriseHour = 6.5;
    let sunsetHour = 18.5;
    
    if (month >= 5 && month <= 7) {
        sunriseHour = 5.5;
        sunsetHour = 20.5;
    } else if (month >= 11 || month <= 1) {
        sunriseHour = 7.5;
        sunsetHour = 16.5;
    } else if (month >= 2 && month <= 4) {
        sunriseHour = 6.5;
        sunsetHour = 19.5;
    } else {
        sunriseHour = 7;
        sunsetHour = 18;
    }
    
    return { sunrise: sunriseHour, sunset: sunsetHour };
}

function getGreeting(hour, sunrise, sunset) {
    if (hour >= 5 && hour < 12) {
        return "Good morning";
    } else if (hour >= 12 && hour < sunset) {
        return "Good afternoon";
    } else if (hour >= sunset && hour < 23) {
        return "Good evening";
    } else {
        return "Good night";
    }
}

function getClosing(hour, sunrise, sunset) {
    const morningClosings = [
        "Have a lovely day",
        "Have a beautiful day",
        "Have a delightful day",
        "Enjoy your day"
    ];
    
    const afternoonClosings = [
        "Enjoy the rest of your afternoon",
        "Have a pleasant afternoon",
        "Have a lovely rest of your day",
        "Enjoy the remainder of your day"
    ];
    
    const eveningClosings = [
        "Have a lovely evening",
        "Have a pleasant evening",
        "Enjoy your evening"
    ];
    
    const nightClosings = [
        "Have a pleasant night",
        "Have a lovely night",
        "Have a good night",
        "Be well"
    ];
    
    if (hour >= 5 && hour < 12) {
        return morningClosings[Math.floor(Math.random() * morningClosings.length)];
    } else if (hour >= 12 && hour < sunset) {
        return afternoonClosings[Math.floor(Math.random() * afternoonClosings.length)];
    } else if (hour >= sunset && hour < 23) {
        return eveningClosings[Math.floor(Math.random() * eveningClosings.length)];
    } else {
        return nightClosings[Math.floor(Math.random() * nightClosings.length)];
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

function getWindDescription(kmh) {
    if (kmh <= 5) {
        return "The wind is calm";
    } else if (kmh <= 11) {
        return `A light breeze is blowing at ${kmh} kph (${kmhToMph(kmh)} mph)`;
    } else if (kmh <= 19) {
        return `A gentle breeze is blowing at ${kmh} kph (${kmhToMph(kmh)} mph)`;
    } else if (kmh <= 28) {
        return `A moderate breeze is blowing at ${kmh} kph (${kmhToMph(kmh)} mph)`;
    } else if (kmh <= 38) {
        return `The wind is blowing at ${kmh} kph (${kmhToMph(kmh)} mph)`;
    } else if (kmh <= 49) {
        return `A stiff wind is blowing at ${kmh} kph (${kmhToMph(kmh)} mph). A fitted jacket will serve you better than a loose one`;
    } else if (kmh <= 61) {
        return `A near gale is blowing at ${kmh} kph (${kmhToMph(kmh)} mph). An umbrella won't do much in this wind`;
    } else if (kmh <= 74) {
        return `A gale is blowing at ${kmh} kph (${kmhToMph(kmh)} mph). You'll feel this one — secure anything you're carrying`;
    } else if (kmh <= 88) {
        return `A strong gale is blowing at ${kmh} kph (${kmhToMph(kmh)} mph). Difficult conditions outside`;
    } else if (kmh <= 102) {
        return `A storm is blowing at ${kmh} kph (${kmhToMph(kmh)} mph). Only venture out if you need to`;
    } else if (kmh <= 117) {
        return `A violent storm is blowing at ${kmh} kph (${kmhToMph(kmh)} mph). Stay indoors if at all possible. Expect widespread damage to trees and structures`;
    } else {
        return `Winds are dangerously high at ${kmh} kph (${kmhToMph(kmh)} mph). Don't make unnecessary journeys, don't take risks on treacherous roads, and don't swim in the sea`;
    }
}

function getWardrobeSuggestion(temp, feelsLike, weatherCode, uvIndex, hour, sunrise, sunset) {
    // Always use feels-like temperature if available, otherwise fall back to actual temp
    const effectiveTemp = (feelsLike !== null && feelsLike !== undefined) ? feelsLike : temp;
    let suggestions = [];
    
    if (effectiveTemp <= -10) {
        suggestions.push("It's absolutely frigid. Wear everything you own");
    } else if (effectiveTemp <= 0) {
        suggestions.push("It's properly cold today. Bundle up");
    } else if (effectiveTemp <= 10) {
        suggestions.push("A warm jacket and some layers would serve you well today");
    } else if (effectiveTemp <= 20) {
        suggestions.push("A light jacket or a sweater should be comfortable");
    } else if (effectiveTemp <= 30) {
        suggestions.push("Dress lightly");
    } else if (effectiveTemp <= 38) {
        suggestions.push("It's hot. Light clothes, a hat, and drink water");
    } else {
        suggestions.push("Wear as little clothing as the situation allows and drink plenty of water");
    }
    
    const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
    if (rainCodes.includes(weatherCode)) {
        suggestions.push("Bring an umbrella because rain is expected");
    }
    
    const snowCodes = [71, 73, 75, 77, 85, 86];
    if (snowCodes.includes(weatherCode)) {
        suggestions.push("Wear waterproof boots. It'll be slippery out.");
    }
    
    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
        suggestions.push("Seek shelter and avoid open areas");
    }
    
    const isDaytime = hour >= sunrise && hour <= sunset;
    
    if (isDaytime && uvIndex >= 3) {
        if (uvIndex >= 3 && uvIndex <= 5) {
            suggestions.push("Consider wearing sunscreen as the UV index is moderate");
        } else if (uvIndex >= 6 && uvIndex <= 7) {
            suggestions.push("Apply SPF 30 or higher sunscreen and wear a hat because the UV index is high");
        } else if (uvIndex >= 8 && uvIndex <= 10) {
            suggestions.push("Use SPF 50 sunscreen, wear a wide-brimmed hat, and limit sun exposure, midday");
        } else if (uvIndex >= 11) {
            suggestions.push("Extreme UV levels! Stay in the shade, use maximum SPF sunscreen, and cover up completely");
        }
    }
    
    if (suggestions.length === 0) {
        return "";
    } else if (suggestions.length === 1) {
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
    
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
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
            if (city) {
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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature&timezone=auto`;
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
            reject(new Error('Geolocation is not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

async function generateBriefing() {
    const now = new Date();
    const { timeString, dateString, hours } = updateTimeAndDate();
    
    let briefingText = '';
    
    try {
        const position = await getUserLocation();
        userLat = position.coords.latitude;
        userLon = position.coords.longitude;
        userCity = await getLocationName(userLat, userLon);
        
        const sunTimes = await getSunriseSunset(userLat, userLon, now);
        const sunrise = sunTimes.sunrise;
        const sunset = sunTimes.sunset;
        
        const greeting = getGreeting(hours, sunrise, sunset);
        const closing = getClosing(hours, sunrise, sunset);
        
        const weather = await getWeather(userLat, userLon);
        
        if (weather) {
            const uvIndex = await getUVIndex(userLat, userLon);
            
            let tempSentence = `a temperature of ${weather.temp}°C (${celsiusToFahrenheit(weather.temp)}°F)`;
            
            if (Math.abs(weather.feelsLike - weather.temp) > 1) {
                tempSentence += `, though it feels like ${weather.feelsLike}°C (${celsiusToFahrenheit(weather.feelsLike)}°F)`;
            }
            
            let windSentence = "";
            if (weather.windSpeed <= 5) {
                windSentence = "The wind is calm.";
            } else {
                windSentence = getWindDescription(weather.windSpeed) + ".";
            }
            
            const suggestion = getWardrobeSuggestion(weather.temp, weather.feelsLike, weather.weatherCode, uvIndex, hours, sunrise, sunset);
            
            briefingText = `${greeting}. It is ${timeString} on ${dateString} in ${userCity}. ` +
                           `${weather.condition} with ${tempSentence}. ${windSentence}`;
            
            if (suggestion) {
                briefingText += ` ${suggestion}.`;
            }
            
            briefingText += ` ${closing}.`;
        } else {
            briefingText = `${greeting}. It is ${timeString} on ${dateString}. Weather data is currently unavailable. ${closing}.`;
        }
        
    } catch (error) {
        const fallbackLat = 40.7128;
        const fallbackLon = -74.0060;
        userCity = "New York City";
        
        const sunTimes = await getSunriseSunset(fallbackLat, fallbackLon, now);
        const sunrise = sunTimes.sunrise;
        const sunset = sunTimes.sunset;
        
        const greeting = getGreeting(hours, sunrise, sunset);
        const closing = getClosing(hours, sunrise, sunset);
        
        const weather = await getWeather(fallbackLat, fallbackLon);
        
        if (weather) {
            const uvIndex = await getUVIndex(fallbackLat, fallbackLon);
            
            let tempSentence = `a temperature of ${weather.temp}°C (${celsiusToFahrenheit(weather.temp)}°F)`;
            
            if (Math.abs(weather.feelsLike - weather.temp) > 1) {
                tempSentence += `, though it feels like ${weather.feelsLike}°C (${celsiusToFahrenheit(weather.feelsLike)}°F)`;
            }
            
            let windSentence = "";
            if (weather.windSpeed <= 5) {
                windSentence = "The wind is calm.";
            } else {
                windSentence = getWindDescription(weather.windSpeed) + ".";
            }
            
            const suggestion = getWardrobeSuggestion(weather.temp, weather.feelsLike, weather.weatherCode, uvIndex, hours, sunrise, sunset);
            
            briefingText = `${greeting}. It is ${timeString} on ${dateString} in ${userCity} (location access was denied). ` +
                           `${weather.condition} with ${tempSentence}. ${windSentence}`;
            
            if (suggestion) {
                briefingText += ` ${suggestion}.`;
            }
            
            briefingText += ` ${closing}.`;
        } else {
            briefingText = `${greeting}. It is ${timeString} on ${dateString}. Unable to load weather data. ${closing}.`;
        }
    }
    
    document.getElementById('briefing').textContent = briefingText;
}

generateBriefing();
setInterval(generateBriefing, 600000);