# Weather App

A small weather app that shows the current weather, the next 24 hours and a 7-day forecast for any city. Plain HTML, CSS and JavaScript, no build step, no API key.

## Features

- Search any city, or use your location
- Switch between Celsius and Fahrenheit
- Current temperature, feels like, humidity and wind
- Next 24 hours and a 7-day forecast with high and low bars
- Animated sky that changes with the weather (sunny, cloudy, rain, snow, storm, night)
- Recent searches saved on your device
- Last forecast kept for offline viewing
- Responsive from phones to big TV screens

## Run it

Open `index.html` in any modern browser. That is all.

Or serve the folder with any static server, for example:

    python3 -m http.server 8000

Then visit http://localhost:8000.

## Files

- `index.html` - page structure
- `style.css` - layout, colors, animated sky and responsive sizing
- `script.js` - city search, weather requests, unit switch and drawing the forecast
- `README.md` - this file

## How the forecast works

The app asks the free Open-Meteo service for the city's coordinates, then asks for the current weather, hourly data and daily data. Weather codes are turned into plain words and a matching sky. Your recent searches and last forecast are stored in your browser's local storage, so nothing is sent anywhere else.
