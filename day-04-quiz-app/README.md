# Quiz App (Exploring Mini Projects, Day 4)

A quiz app built with plain HTML, CSS and JavaScript. No libraries, no build step, no server.

Play the built-in quizzes, make your own, and send it to friends with a link.

## Files

- `index.html` - page structure (start, quiz, result, create, my quizzes, scores, share window)
- `style.css` - candy gradient look, dark and light themes, one type scale, responsive layout, reduced-motion support
- `script.js` - quizzes, timer, scoring, quiz builder, share links, leaderboard

## Run it

Open `index.html` in any modern browser. Nothing to install.

## Make your own quiz

1. Press **Create** at the top.
2. Type a title, then add questions. Each question has 2 to 4 answers: tick the circle next to the right one.
3. Optional: pick a time for the whole quiz, or a different time for one question.
4. Add, remove and reorder questions with the arrows. The preview on the side shows what players will see.
5. Press **Save quiz**. It stays in this browser, under **My quizzes**, where you can play, share, edit, duplicate or delete it.

Wrong input is caught before saving: a missing title, an empty question, fewer than two answers, repeated answers, or no right answer ticked. Each problem is listed and the list links to the field. Your work in progress is kept if you close the tab.

## Share a quiz

Press **Share** on any quiz in My quizzes (or **Save and share** while making it).

- **Copy link** puts the link on the clipboard and shows a "Copied" message. If the browser blocks copying, the link is selected so you can press Ctrl+C or press and hold to copy.
- **WhatsApp** opens WhatsApp with a ready message and the link. **Telegram**, **X** and **Email** work the same way.
- **More apps** opens the phone's own share sheet, when the device has one.

The link opens the quiz straight away, with your title, after a short 3-2-1 countdown. Players can also save a copy to their own My quizzes, or paste a link into the box on the My quizzes page.

How it works without a server: the quiz is packed into the part of the link after the `#`. It is turned into compact JSON, squeezed with a small built-in compressor (LZW) and written in URL-safe base64. That part never leaves the browser, so nothing is uploaded. The right answers are inside the link, but not readable at a glance.

Link length: a link over 2000 characters shows a warning (some apps cut long links). Over 8000 characters it is not offered; remove a few questions or shorten them. The builder shows the live link size while you type.

After a game, **Share my score** sends "I scored 4/5 on <quiz title>! Try it: <link>".

## Features

- Four built-in topics (Coding basics, Space, Geography, Science) plus a Mixed bag, with 8 questions each; each game picks 5 or 8 random ones
- Modes: Relaxed (no timer), Classic (15 seconds), Blitz (8 seconds)
- Points for each right answer: 10 plus the seconds left (no bonus in Relaxed)
- Streak counter, progress bar and live score
- Animated question changes, answer reveal, tap ripples, confetti for a high score
- Review of every answer at the end
- Local leaderboard of your top scores, with a player name
- Best score per quiz saved in the browser (localStorage)
- Dark and light themes
- Sound effects (off by default; the speaker button turns them on)

## Keyboard

- Keys 1 to 4 pick an answer
- Enter goes to the next question (or skips the countdown)

## Type sizes

All text uses one set of size and spacing variables at the top of `style.css` (`--fs-label` to `--fs-hero`, `--sp-1` to `--sp-6`). Sizes scale smoothly with the screen using `clamp()`, and the base size grows on very large screens (full HD, 4K) so text stays in proportion.

## Notes

- Works on phones, tablets, laptops and TV screens.
- Respects the "reduce motion" setting in the operating system.
- Add built-in questions by editing the `TOPICS` list at the top of `script.js`.
