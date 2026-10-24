# Focus Timer

Work in focused blocks with short breaks, keep a small task list and see how much deep work you did. Free, no sign-up, and nothing leaves your device.

An example app made by the Kodeby team and listed on [kodeby.app](https://kodeby.app).

## What it does

- Focus blocks with short and long breaks (25, 5 and 15 minutes to start with, and you can change them)
- A long break after every fourth focus block, shown as dots under the timer
- Breaks and the next focus block can start by themselves
- A task list: estimate how many blocks each task needs, pick the one you work on, and finished blocks are counted on it
- Today's focus time, blocks done, days in a row and a chart for the last seven days
- A soft sound when time is up, and the time left in the browser tab
- Keeps running if you reload the page, and press Space to start or pause
- English and Norwegian

## Privacy

Everything is stored in your browser's local storage. There is no server, no account, no analytics and no cookies.
The Content Security Policy in `vercel.json` blocks all network requests from the page (`connect-src 'none'`). Only kodeby.app may show the page in a frame, for the "Try it here" demo on its app page.

## Run locally

It is plain HTML, CSS and JavaScript with no build step:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Import the repository in Vercel with the default settings (Framework preset: Other, no build command).

## License

MIT
