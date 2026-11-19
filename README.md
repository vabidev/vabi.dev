# vabi.dev

A personal page about Vinicius, styled like an early-2000s console system menu. Find me on Discord: **@VABIMS**.

On the first visit of a session it plays a boot sequence (blue nebula with swirling tiles, then a field of cube towers), then opens the menu: a ring of glowing orbs next to **About / Projects / Clock / GitHub / Contact**. Navigate with the arrow keys, **Enter** to select, **Esc** to go back and **Shift** to switch between English and Portuguese. Mouse and touch work too, and the key hints at the bottom are tappable.

## Structure

- `index.html` — boot overlay, menu and the About, Projects, Clock and Contact screens
- `styles.css` — 16:9 "TV" stage layout, menu, screens, key hints, portrait layout for phones
- `main.js` — screen switching, selection, keyboard/mouse/touch input, EN/PT copy, copy-to-clipboard
- `boot.js` — boot sequence (three.js r128 from cdnjs); skipped with any key, click or tap
- `orbs.js` — the orb ring on the menu (canvas 2D)
- `clock.js` — the clock screen: the lit rod is the current hour, the dots sweep with the seconds

No build step: host the folder as a static site. The only external files are the Arimo font (Google Fonts) and three.js (cdnjs). Visitors who prefer reduced motion skip the boot and get still versions of the animations.
