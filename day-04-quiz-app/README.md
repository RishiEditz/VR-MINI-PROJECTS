# Quiz App (Exploring Mini Projects, Day 4)

A quiz app built with plain HTML, CSS and JavaScript. No libraries, no build step.

## Files

- `index.html` - page structure (start, quiz and result screens)
- `style.css` - gradient background, animations, responsive layout, reduced-motion support
- `script.js` - topics, timer, scoring, review and best scores

## Run it

Open `index.html` in any modern browser. Nothing to install.

## Features

- Four topics: Coding basics, Space, Geography and Science (five questions each)
- A 15 second timer per question (the bar turns red in the last five seconds)
- A progress bar and a live score
- Points for each right answer: 10 plus the seconds left
- Animated feedback: a confetti burst on a right answer, a shake on a wrong one
- Review of every answer at the end
- Play again, or change the topic
- Best score per topic saved in the browser (localStorage), so it stays after a reload

## Keyboard

- Keys 1 to 4 pick an answer
- Enter goes to the next question

## Notes

- Works on phones, tablets, laptops and TV screens.
- Respects the "reduce motion" setting in the operating system.
- Add your own questions by editing the `TOPICS` list at the top of `script.js`.
