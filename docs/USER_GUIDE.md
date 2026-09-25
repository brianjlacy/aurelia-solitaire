# How to play Klondike Solitaire

## Goal

Move all 52 cards onto the four **foundations** (top right), building each one
up by suit from Ace to King.

## The table

- **Stock** (top left): face-down cards. Click it to draw one card (easy) or
  three cards (standard) onto the **waste**. When the stock is empty, click it
  again to turn the waste over and go through it again.
- **Waste**: only its top card can be played.
- **Foundations**: one per suit (♥ ♦ ♠ ♣). Start each with an Ace.
- **Columns** (the tableau): seven piles. Build down in alternating colours —
  a red 6 on a black 7. Only a King may fill an empty column. Face-down cards
  turn over automatically when uncovered.

## Moving cards

| How          | What to do                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Drag         | Drag a card (and any cards on it) to another pile. Invalid drops snap back.                                                    |
| Tap / click  | Click a card to pick it up (valid destinations are outlined), then click the destination. Click the card again to put it down. |
| Double-click | Sends the top card of a column or the waste to its foundation.                                                                 |
| Keyboard     | See below.                                                                                                                     |

When every card is face-up and the stock is empty, **Auto-complete** appears
and finishes the game for you.

## Keyboard

| Key             | Action                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Tab / Shift+Tab | Move between piles                                                              |
| Arrow keys      | Move between piles; Up/Down within a column                                     |
| Enter / Space   | Pick up the focused card, then drop it on the focused pile; draw from the stock |
| Ctrl+Z / Ctrl+Y | Undo / redo (Ctrl+Shift+Z also redoes)                                          |
| H               | Hint — highlights a suggested move                                              |
| N               | New game                                                                        |
| ?               | Help                                                                            |
| Esc             | Cancel a drag or selection; close dialogs                                       |

Every action is announced to screen readers.

## Settings

Open **Settings** to choose draw one or draw three (applies to the next deal),
theme (match system, classic green, dark, high contrast), card back colour,
hint limit, timer visibility, and sound volume. Settings are saved in your
browser.

## Statistics

**Stats** shows games played and won, win rate, best time, fewest moves,
current and best winning streak, and total playtime. Starting a new game after
making a move counts the abandoned game as a loss.

## Tips

- Your game is saved automatically — close the tab and pick up where you left off.
- Share a specific deal by adding `?seed=<number>` to the address, e.g. `?seed=2026`.
