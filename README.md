# TPPWeb590 WebAssembly demo

Published Unreal Third Person build. This repository contains the exported game and deployment configuration, not the Unreal source project.

## Local preview

From this directory run:

    npx lite-server -c bs-config.js

Open the localhost URL. The server configuration supplies the cross-origin isolation headers required by Wasm threads.

## Deploy an updated export

1. Package the game into the Wasm folder here.
2. Run `node scripts/prepare-pages.cjs` to check all cached asset hashes.
3. Commit the updated Wasm files and push main.

GitHub Actions reconstructs the large .wasm file from its tracked .wasm.br copy, enables the built-in isolation service worker in the deployment copy, verifies the cached assets, and publishes _site.

The uncompressed .wasm, Wasm-Debug, and _site are ignored by Git. Preserve the .wasm.br file. Pages publishes only _site; the server configuration and preparation script are not part of the hosted site.

For isolation in future local exports, enable Project Settings > Platforms > Wasm > Inject isolation headers before packaging. The Pages preparation script enables this independently on every deployment.
