# PRTS identity assets

- `jarvis/ui/web/frontend/public/prts-mark.png`: PRTS emblem supplied by the project owner for the application identity, 2026-10-16. The supplied image is preserved unchanged. `prts-icon.svg` embeds that same PNG on a dark neutral plate for browser-tab contrast; the boot mark uses the same plate through its light/dark theme tokens. The emblem is associated with Arknights; original rights remain with their respective holders. This file is not an independently authored project logo.
- `jarvis/ui/web/frontend/src/assets/priestess-avatar.png`: static reference-based cartoon Priestess portrait generated with the built-in image-generation tool, 2026-10-16, and selected by the project owner. The owner supplied the character references. Original character rights remain with their respective holders; this rendering is AI-generated and is not official game artwork.

The generation prompt requested a head-and-shoulders cartoon avatar preserving the supplied dark hair, headband, silvery violet diamond-shaped eyes, white high-neck top, black ribbon and white coat, on transparency with no text or logos.

The portrait identifies the lead in roster, profile and message swatches. The approved cartoon artwork uses charcoal hair, a headband, large circular eyes with diamond pupils, a white coat and a black ribbon.

- `src/assets/priestess/guide-idle.webp` and `talking.webp` (under the frontend): approved reference-based cartoon guide poses generated with the built-in image-generation tool, composed into a fixed talking pose with three mouth shapes. Glasses, head, body and hand remain fixed during talking. Guide text completion returns to the resting pose.
- `src/assets/priestess/typing.webp` and `typing-still.webp`: approved reference-based character and keyboard artwork, composed into a 28-tap working loop with one Enter strike and continuous return. The original expression, raised keycaps and deeper casing are preserved. The loop is 4.04 seconds; WebP exports keep transparent backgrounds. All character rights remain with their respective holders; these generated renderings are not official game artwork.

Shared in-app marks use the approved default artwork while preserving a selected custom pet. Working-state badges remain independent, and reduced-motion preferences use static images. Existing companion models and animation recipes are unchanged. Native installer icons and persistent installation names remain separate migration work.

This fork derives from Dodaios. Upstream license, copyright and asset attribution notices remain in place. Existing service names, repository URLs, command aliases, credential-store names and saved identity keys retain their compatibility meaning.
