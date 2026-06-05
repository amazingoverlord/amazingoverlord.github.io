// weather-minimal.js
// Minimal weather widget: displays date/time, conditions, temp, feels-like temp

(function () {
  const WEATHER_DESCRIPTIONS = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Light Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Light Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Light Showers",
    81: "Moderate Showers",
    82: "Violent Showers",
    85: "Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm With Hail",
    99: "Severe Thunderstorm",
  };

  const WEEKDAY_ABBR = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
  const FALLBACK_LAT = 40.7128;
  const FALLBACK_LON = -74.006;
  const FALLBACK_LOCATION = "New York (fallback)";

  function formatTemp(celsius) {
    const c = Math.round(celsius);
    const f = Math.round(c * 9 / 5 + 32);
    return `${c}°C (${f}°F)`;
  }

  function formatDateTime(date) {
    const weekday = WEEKDAY_ABBR[date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${weekday} ${month}-${day}-${year} | ${hours}:${minutes}`;
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 2) + ".." : str;
  }

  function buildReport(weatherData, location, timestamp) {
    if (!weatherData?.current) {
      return "[ unavailable ]\nCould not retrieve weather data.";
    }

    const { weather_code, temperature_2m, apparent_temperature } = weatherData.current;
    const condition = WEATHER_DESCRIPTIONS[weather_code] ?? "Variable";
    const shortLocation = truncate(location, 24);

    return [
      shortLocation + "<br>",
      formatDateTime(timestamp),
      "<br><br>",
      condition + "<br>",
      "Temp:        " + formatTemp(temperature_2m) + "<br>",
      "Feels like:  " + formatTemp(apparent_temperature),
    ].join("\n");
  }

  async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    return res.json();
  }

  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`
      );
      const { address } = await res.json();
      const city =
        address?.city ||
        address?.town ||
        address?.village ||
        address?.county ||
        address?.state ||
        "Unknown";
      return truncate(city, 22);
    } catch {
      return "Unknown";
    }
  }

  async function getGeolocation() {
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 7000,
        enableHighAccuracy: false,
      })
    );
  }

  // Module state
  let cachedWeather = null;
  let cachedLocation = "loading...";
  let outputElement = null;
  let timeInterval = null;
  let weatherInterval = null;

  function updateDisplay() {
    if (!outputElement) return;
    if (!cachedWeather) {
      outputElement.innerHTML = "[ waiting for weather data... ]";
      return;
    }
    outputElement.innerHTML = buildReport(cachedWeather, cachedLocation, new Date());
  }

  async function refreshWeather() {
    const { lat, lon } = window.__weatherCoords ?? {};
    if (!lat || !lon) return;
    try {
      cachedWeather = await fetchWeather(lat, lon);
      updateDisplay();
    } catch (err) {
      console.warn("Background weather refresh failed:", err);
    }
  }

  async function init(container) {
    if (!container) {
      console.error("weather-minimal: no container element provided");
      return;
    }

    outputElement = container;
    outputElement.innerHTML = "[ locating & fetching weather... ]";

    let lat = FALLBACK_LAT;
    let lon = FALLBACK_LON;
    cachedLocation = FALLBACK_LOCATION;

    try {
      const position = await getGeolocation();
      lat = position.coords.latitude;
      lon = position.coords.longitude;
      cachedLocation = await reverseGeocode(lat, lon);
    } catch (err) {
      console.warn("Geolocation unavailable, using fallback (NYC):", err);
    }

    window.__weatherCoords = { lat, lon };

    try {
      cachedWeather = await fetchWeather(lat, lon);
      updateDisplay();
    } catch (err) {
      console.error("Weather fetch failed:", err);
      outputElement.innerHTML =
        "[ ERROR ] Could not fetch weather.\nCheck connection or location permissions.";
      return;
    }

    clearInterval(timeInterval);
    timeInterval = setInterval(updateDisplay, 60_000);

    clearInterval(weatherInterval);
    weatherInterval = setInterval(refreshWeather, 10 * 60_000);
  }

  window.WeatherMinimal = { init };
})();