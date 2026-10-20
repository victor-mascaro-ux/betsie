# Betsie — working prototype

Bets with your besties. A functional, hi-fi prototype of the Betsie iOS app, built from the
[Betsie Figma file](https://www.figma.com/design/8MOmXASKMPvxyHsxqQLLAq/Betsie).

Live: **https://victor-mascaro-ux.github.io/betsie/**

```bash
npm install
npm run dev        # http://localhost:5181
```

## Guided tour

The left column walks anyone through the prototype **one task at a time**: wake Maxine’s phone,
text Sylvia a bet, turn it into a Betsie bet, accept it, set the stakes, talk trash, skip to the
end, vote, celebrate and share. Each task has a **Show me** button that does it on the phones while
you watch (a touch indicator taps, keys light up as it types). Do it yourself instead and the tour
notices and moves on; a pulsing ring shows where to tap after a couple of seconds. If Sylvia says
no, the tour offers to send the same challenge again. **Start Over**
puts everything back. On desktop, choose **Both phones** or **One phone** (the phone experience,
switching to whoever the task is about). On a phone, the task sits under the screen.

## What you can do

Two phones run side by side on desktop: **Maxine’s** and **Sylvia’s**. Whatever one does shows up
on the other straight away (notifications, bets, comments, votes). On a phone-sized screen you see
one phone and can switch between them.

- **Phone**: lock screen with live time and notifications, home screen with a Betsie widget,
  banners, share sheet, and a standard iOS keyboard on desktop (phones use their own). When the
  keyboard opens, the screen scrolls the field into view.
- **Betsie app**: start a bet (friend picker, bet text, end date and time, who can see it),
  pick a decision method, review and send. The other person accepts or declines before the clock
  runs out. Set the stakes, trash-talk in the comments (emoji, likes, GIPHY stickers), vote on who
  won, then celebrate (or wear the jester hat, in the rain, in tears), share to Messages or your Instagram story, and keep
  score in your Book of Bets.
- **Messages**: text each other. Write “I bet …” and a clover appears: tap it and Betsie opens
  inside iMessage with the bet filled in. Betsie then runs the bet in a “Betsie: Maxine vs. Sylvia”
  thread: challenge with YES/NO, “your bet is on”, stakes, who won, the winner.
- Friends without a phone (Megan, Christopher, …) accept, vote and reply on their own.
- **Double-click any empty text box** to fill it with a sample, so demos never stall on typing.

The demo panel (left, or the clover button on a phone) ends bets early so you can get to the vote,
and resets everything. Data is saved in this browser only (localStorage).

## Code

| Path | What |
| --- | --- |
| `src/App.tsx` | Two-phone desktop shell, single-phone mobile shell, demo panel |
| `src/data/` | Store (actions, notifications, Betsie’s messages, friends who answer on their own), seed data, stats |
| `src/os/` | The phone: lock screen, home screen, banners, keyboard, share sheet |
| `src/betsie/` | The Betsie app: navigation, screens, comments, celebration |
| `src/imessage/` | Messages: conversations, Betsie’s rich cards, Betsie inside iMessage |
| `src/styles/` | Tokens from Figma, plus per-area styles |
| `src/assets/` | Images and icons exported from the Figma file |

Motion: one quick spring for layout, a bouncier one for things arriving, pressed states on every
tap, and screen pushes, sheets and pop-ins throughout (`src/styles/tokens.css`).

## Figma assets

`figma/` holds a read-only pipeline that pulls the design out of Figma (the Figma connector needs an
editor seat, so it reads the file from the figma.com editor instead):

1. `node figma/receiver.mjs figma/raw`
2. In the browser console of the Betsie file on figma.com:
   ```js
   (0, eval)(await (await fetch('http://127.0.0.1:47821/extract.js')).text())
   await __bx.graph(); for (let i = 0; i < 201; i += 5) await __bx.frames(i, 5); await __bx.images()
   ```
3. `node figma/pick-assets.mjs` copies the images and icons the app uses into `src/assets`.
   `node figma/describe.mjs <frameId>` prints a frame’s layers with exact sizes, colours and type.

`figma/raw` is git-ignored. Pushing to `main` builds and deploys to GitHub Pages.

## Notes

- **SF Pro** isn’t bundled (Apple’s licence). Apple devices render it natively; elsewhere Inter
  stands in, scaled to SF Pro’s widths.
- All people, records and bets are placeholder demo data.
