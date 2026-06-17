# DonPihagi

**돈피하기** is a tiny browser arcade game inspired by classic falling-object dodge games.

Avoid spending temptations, collect real saving items, and keep the stick figure's balance alive for as long as possible. Survival time is saved as the high score in `localStorage`, while saving points come from helper items and near misses. Players can set a nickname before starting, and the top 100 runs are ranked locally in the browser.

Visual rule: black falling objects are danger. Green, blue, and red tokens are collectibles with different effects.
The rare red `투자대박` token clears every falling object on screen.

## Run

Open `index.html` in a browser.

## Controls

- Mobile/touch: drag your finger across the play area to move
- Mobile dash: double-tap the left or right side of the play area to dash that way
- Keyboard move: `←` / `→` or `A` / `D`
- Keyboard dash: `Space` or `Shift`. You start with 5 dashes, then collect blue dash tokens to stock up with no cap.

## Difficulty

Choose `쉬움`, `보통`, or `어려움` before starting. Easier modes slow hazards and give helper items more often; harder modes do the opposite.
