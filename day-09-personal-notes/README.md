# Personal Notes (Mini Projects, Day 9)

A notes app with colour labels, tags, pins, search, undo, JSON export and import, and a dark and light theme. Plain HTML, CSS and JavaScript, no libraries, no build step.

## Files

- `index.html` - the page: header, note list, editor, toast
- `style.css` - the look, responsive layout and motion settings
- `script.js` - storage, demo notes, search, tags, filters, editor and backup
- `README.md` - this file

## Run it live

https://rishieditz.github.io/VR-MINI-PROJECTS/day-09-personal-notes/

Or open `index.html` in any modern browser.

## Features

- Create, edit and delete notes, and every change saves by itself as you type
- Delete and import both show an Undo button
- Pin notes to keep them at the top
- Six colour labels, with a colour filter
- Tags on every note, with a tag filter that shows how many notes use each tag
- Search across titles, text and tags, with the matches highlighted
- Sort by last edited, newest created or title
- Word and character count for the open note
- Export all notes to a JSON file, and import one back (notes merge by id, the newer edit wins)
- Dark and light theme, remembered between visits
- Empty notes are never saved
- Works on phone, tablet, laptop, TV and 4K screens, with 44 px touch targets
- Respects the reduced motion setting

## Keyboard

| Key | Action |
| --- | --- |
| N | New note |
| / | Search |
| Esc | Clear search, or go back from the editor on a phone |
| Enter or comma | Add a tag |

## How it works

- Notes are saved in this browser with localStorage, so they are not synced across devices. Use Export and Import to move them.
- Saving waits for a short pause in typing, and is forced when you leave the page.
- Data is checked when it is loaded or imported, so a bad file cannot break the app. An unreadable saved copy is kept under a separate key instead of being thrown away.
- On a phone the editor opens as a full screen sheet. On a wide screen the list and editor sit side by side.
- Every note is added with `textContent`, never `innerHTML`.

## Notes

- Nothing is sent anywhere. Everything stays in the browser.
- Clear the site data in your browser to remove your notes.
