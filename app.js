// Simple Weather App — Always Light Theme (No dark toggle / footer)
// Replace your API key below ↓
const API_KEY = "978e6d0fa9aa9cadd04d830e4c3ec3fc";

const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const geoBtn = document.getElementById("geoBtn");
const unitsBtn = document.getElementById("unitsBtn");

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const weatherWrap = document.getElementById("weatherWrap");
const skeleton = document.getElementById("skeleton");

const weatherIcon = document.getElementById("weatherIcon");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("desc");
const locationEl = document.getElementById("location");
const feelsEl = document.getElementById("feels");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const forecastEl = document.getElementById("forecast");

let units = localStorage.getItem("weather-units") || "metric"; // °C default
let lastQuery = null;

// Helpers
function showLoading(show = true) {
  loadingEl.style.display = show ? "block" : "none";
  loadingEl.textContent = show ? "Loading..." : "";
  loadingEl.classList.toggle("hidden", !show);
  if (skeleton) skeleton.classList.toggle("visible", show);
  if (weatherWrap) {
    const currentEl = weatherWrap.querySelector(".current");
    const forecastGrid = weatherWrap.querySelector(".forecast-grid");
    if (show) {
      weatherWrap.classList.remove("hidden");
      currentEl?.classList.add("hidden");
      forecastGrid?.classList.add("hidden");
    } else {
      currentEl?.classList.remove("hidden");
      forecastGrid?.classList.remove("hidden");
      skeleton?.classList.remove("visible");
    }
  }
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}
function hideError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function showWeather(show = true) {
  weatherWrap.classList.toggle("hidden", !show);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error fetching data");
  }
  return res.json();
}

function currentUrlByCity(city) {
  return `${CURRENT_URL}?q=${encodeURIComponent(
    city
  )}&units=${units}&appid=${API_KEY}`;
}
function forecastUrlByCity(city) {
  return `${FORECAST_URL}?q=${encodeURIComponent(
    city
  )}&units=${units}&appid=${API_KEY}`;
}
function currentUrlByCoords(lat, lon) {
  return `${CURRENT_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`;
}
function forecastUrlByCoords(lat, lon) {
  return `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`;
}

function renderCurrent(data) {
  const weather = data.weather[0];
  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  weatherIcon.innerHTML = `<img src="${iconUrl}" alt="${weather.description}">`;
  tempEl.textContent = `${Math.round(data.main.temp)}°${
    units === "metric" ? "C" : "F"
  }`;
  descEl.textContent = weather.description;
  locationEl.textContent = `${data.name}, ${data.sys.country}`;
  feelsEl.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed.toFixed(1)} m/s`;
}

function groupForecastByDay(forecastData) {
  const groups = {};
  forecastData.list.forEach((item) => {
    const d = new Date(item.dt * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(item);
  });
  const days = Object.keys(groups).map((key) => {
    const items = groups[key];
    let chosen = items[0];
    let minDiff = Infinity;
    for (const it of items) {
      const h = new Date(it.dt * 1000).getHours();
      const diff = Math.abs(h - 12);
      if (diff < minDiff) {
        minDiff = diff;
        chosen = it;
      }
    }
    return { date: key, item: chosen };
  });
  return days.slice(0, 5);
}

function renderForecast(forecastData) {
  const days = groupForecastByDay(forecastData);
  forecastEl.innerHTML = days
    .map((day) => {
      const d = new Date(day.item.dt * 1000);
      const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
      const icon = day.item.weather[0].icon;
      const desc = day.item.weather[0].description;
      const tMin = Math.round(day.item.main.temp_min);
      const tMax = Math.round(day.item.main.temp_max);
      return `
        <div class="forecast-card">
          <div class="forecast-day">${weekday}</div>
          <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}">
          <div class="forecast-temp">${tMax}° / ${tMin}°</div>
          <div class="forecast-desc">${desc}</div>
        </div>`;
    })
    .join("");
}

async function loadWeatherByCity(city) {
  showLoading(true);
  hideError();
  showWeather(false);
  try {
    const [current, forecast] = await Promise.all([
      fetchJson(currentUrlByCity(city)),
      fetchJson(forecastUrlByCity(city)),
    ]);
    renderCurrent(current);
    renderForecast(forecast);
    showWeather(true);
  } catch (err) {
    showError("City not found or invalid API key.");
  } finally {
    showLoading(false);
  }
}

async function loadWeatherByCoords(lat, lon) {
  showLoading(true);
  hideError();
  showWeather(false);
  try {
    const [current, forecast] = await Promise.all([
      fetchJson(currentUrlByCoords(lat, lon)),
      fetchJson(forecastUrlByCoords(lat, lon)),
    ]);
    renderCurrent(current);
    renderForecast(forecast);
    showWeather(true);
  } catch {
    showError("Unable to fetch weather for your location.");
  } finally {
    showLoading(false);
  }
}

// Events
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) loadWeatherByCity(city);
});

geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return showError("Geolocation not supported.");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      loadWeatherByCoords(latitude, longitude);
    },
    () => showError("Permission denied or unavailable."),
    { timeout: 10000 }
  );
});

unitsBtn.addEventListener("click", () => {
  units = units === "metric" ? "imperial" : "metric";
  unitsBtn.textContent = units === "metric" ? "°C" : "°F";
  localStorage.setItem("weather-units", units);
  if (lastQuery?.city) loadWeatherByCity(lastQuery.city);
});

// Optional: auto-fetch location on load
window.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {}
    );
  }
});
