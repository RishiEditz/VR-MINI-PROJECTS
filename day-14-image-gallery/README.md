# Day 14: Image Gallery with Filters

Part of **Exploring Mini Projects**, one small browser project a day, built with plain HTML, CSS and JavaScript. No framework, no build step, no API key, and no image downloads.

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-14-image-gallery/

Or open `index.html` in any modern browser.

## Files

- `index.html` the page markup
- `style.css` the berry-citrus theme, grid layout, viewer and light mode
- `gallery-data.js` the 16 pictures, each drawn in code as an SVG scene
- `script.js` filtering, search, favorites, the viewer, effects and the slideshow

## Features

- 16 pictures in four categories: Nature, City, Space and Abstract
- Category chips with live counts, plus a Favorites chip
- Search by title, category or tag, and combine it with a category
- Tap the heart on any picture to save it; favorites stay on your device
- Full-screen viewer with previous and next, swipe and arrow keys
- Seven photo effects (Original, Mono, Sepia, Vivid, Cool, Fade, Invert) and a brightness slider
- Slideshow that moves on every few seconds
- Dark and light themes, remembered between visits
- Responsive from small phones to 4K screens, with 44 px touch targets
- Respects reduced motion

## Keyboard

- Arrow left and right: previous and next picture in the viewer
- F: favorite the open picture
- Space: start or pause the slideshow
- Esc: close the viewer
- Arrow keys on the category chips: switch category

## How it works

1. Each picture is a small function that draws shapes (mountains, towers, stars, waves and so on) into an SVG, using a seeded random number generator so the same picture looks the same every time.
2. The grid uses CSS Grid with dense packing. Tall and wide pictures span extra rows or columns, and the number of columns grows with the screen width.
3. Filtering is one function: a picture is shown if it matches the selected category and every word typed in the search box.
4. Effects are CSS `filter` values applied to the open picture, so nothing is re-drawn when you change them. Brightness is a second filter driven by a CSS variable.
5. Favorites, the theme and the last category are kept in `localStorage`. If storage is blocked, the gallery still works for the session.

## Notes

Because the pictures are code, you can add one by adding an entry to the list in `gallery-data.js`: give it a title, category, tags, a scene type, a seed and a colour list.
