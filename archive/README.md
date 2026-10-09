# Archive: code that is not loaded by the page but is worth keeping in sight

| File | What it was | Why it is here |
|---|---|---|
| `pixel-backdrop.js` | Claude's night scroll: the fixed pixel world behind everything below the grove (23-colour palette, Bayer dither, river, ponds, fireflies, aurora) | `pixel-journey.js` absorbed its palette, sky, moon, aurora, clouds, hills and blob trees. `pixel-backdrop.css` is still loaded. Read this file to see where the walk's painters came from. |
| `census.js` | The citizen census: the tree society walking a night strip under the grove simulator, counted by model type | The Sol pass replaced the meeting section with the village. Restore by loading it as a module and re-adding the `#the-meeting` census markup from commit `dd42b90`. |

Root `experience.js` and `style.css` stay where they are: the duplicate `jaronfly-section.html` at the root still loads them.
