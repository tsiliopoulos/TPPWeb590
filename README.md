# TPPWeb590 — UE 5.9.0 Preview WebAssembly demo

[Play the demo](https://www.tsiliopoulos.com/TPPWeb590/) · [Deployment workflow](https://github.com/tsiliopoulos/TPPWeb590/actions/workflows/pages.yml)

This repository hosts a packaged Unreal Engine Third Person project running in a browser through WebAssembly (Wasm) and WebGPU. The game runs on the player's device; GitHub Pages serves its static files.

This guide covers installing Emscripten, creating a compatible project, building and packaging it in UE 5.9.0 Preview, testing it locally, and deploying it to GitHub Pages. The repository contains the exported game and deployment configuration, **not the Unreal source project**. Cloning it lets you serve the existing build, but rebuilding gameplay requires the original `.uproject`, source, content, and configuration.

## 1. Install the prerequisites

These instructions use Windows and the UE 5.9.0 Preview installation used for this demo. Preview requirements can change: check `Engine/Platforms/Wasm/Docs/GettingStarted.md` and `Engine/Platforms/Wasm/Config/Wasm_SDK.json` in your own engine installation after an upgrade.

| Tool | Purpose |
| --- | --- |
| UE 5.9.0 Preview with Wasm platform files and libraries | Builds and packages the Unreal project for the browser. The installation should contain `Engine/Platforms/Wasm`. |
| A Visual Studio C++ development setup supported by your engine build, including a Windows SDK | Builds the project's native editor modules used during cooking. |
| Git | Downloads Emscripten and pushes the exported build to GitHub. |
| Python 3.8 or newer | Runs the Windows Emscripten SDK installer and local server. Unreal also includes Python for its tooling. |
| **Emscripten 6.0.10** | Compiles and links the game for WebAssembly. This Preview installation pins the minimum, main, and maximum SDK versions to `6.0.10`. |
| Node.js and npm | Runs this repository's deployment preparation script and optional lite-server preview. The GitHub workflow uses Node.js 22. |
| A current Chrome or Edge browser with WebGPU support | Tests the browser build. |
| A GitHub account | Hosts the repository and runs the Pages deployment workflow. |

Emscripten is needed on the machine that builds the Unreal project. Players do not install it, and this repository's GitHub Actions workflow does not need it because Unreal compilation happens before the export is committed.

The installed Preview documentation also describes an agent-assisted workflow through `Engine/Platforms/Wasm/Skills/web-deploy/SKILL.md`. Use the documentation shipped with your engine when investigating Preview-specific build problems.

## 2. Install and configure Emscripten

Emscripten provides the WebAssembly compiler toolchain and supporting runtime libraries. Installing Unreal alone does not configure a manually installed Emscripten SDK for the project.

The following commands use **PowerShell**. `C:\Development\emsdk` is an example installation path; choose another location if needed.

```powershell
New-Item -ItemType Directory -Force C:\Development
Set-Location C:\Development
git clone https://github.com/emscripten-core/emsdk.git
Set-Location .\emsdk
.\emsdk.bat install 6.0.10
.\emsdk.bat activate 6.0.10
```

Use `6.0.10`, **not `latest`**, for the Preview build documented here. The general [Emscripten installation guide](https://emscripten.org/docs/getting_started/downloads.html) explains SDK installation and activation; Unreal's `Wasm_SDK.json` determines the version this engine accepts.

Set `WASM_EMSDK_ROOT` to the SDK root directory, not its `upstream\emscripten` subdirectory:

```powershell
[Environment]::SetEnvironmentVariable(
    'WASM_EMSDK_ROOT',
    'C:\Development\emsdk',
    'User'
)
$env:WASM_EMSDK_ROOT = 'C:\Development\emsdk'
```

The first command persists the variable for future processes. The second makes it available in the current PowerShell session. Close and reopen Unreal Editor and any launcher or terminal used to start it so they inherit the new environment.

Confirm the installed version:

```powershell
Get-Content "$env:WASM_EMSDK_ROOT\upstream\emscripten\emscripten-version.txt"
```

It should report `6.0.10`. The activated SDK root should also contain `.emscripten`.

Verify that Unreal recognizes it, adjusting the engine path for your installation:

```powershell
& 'D:\Epic Games\UE_5.9\Engine\Build\BatchFiles\RunUAT.bat' `
    Turnkey -command=VerifySdk -platform=Wasm
```

You can also inspect the SDK status under **Platforms > Wasm** in the editor. If validation fails, check the actual version and path rather than relying only on the menu status.

Unreal searches `WASM_EMSDK_ROOT`, then `EMSDK`, then its configured AutoSDK location. A stale environment variable can point it at the wrong SDK. For a manual installation, explicitly set `WASM_EMSDK_ROOT` as above. If your team uses AutoSDK instead, follow the engine's AutoSDK instructions and leave both manual variables unset; setting either bypasses AutoSDK setup.

## 3. Create and configure the Unreal project

1. Open UE 5.9.0 Preview and create a project using **Games > Third Person**.
2. Select **C++** and name the project, for example `TPPWeb590`. The Preview documentation requires a C++ project for Wasm. For an existing Blueprint-only project, add a C++ class and build its editor module first.
3. Open the project and verify that it runs normally in the editor.
4. Under **Project Settings > Maps & Modes**, set the intended **Game Default Map**. Ensure the maps required by the game are included in the cook.
5. Open **Project Settings > Platforms > Wasm** and configure the page title, startup behavior, and other web options.
6. Enable **Inject isolation headers** for GitHub Pages. This enables the exported service worker to establish the cross-origin isolation required by Wasm threads.
7. Save the project settings.

The isolation option corresponds to this entry in the source project's `Config/DefaultEngine.ini`:

```ini
[/Script/WasmTargetPlatform.WasmTargetSettings]
bInjectIsolationHeaders=True
```

If the section already exists, update it rather than adding a duplicate. This repository's deployment preparation also enables the option in the published page, so repackaging with the setting off does not silently break Pages hosting.

Use the Preview-supported rendering options described in the engine's Wasm documentation. Do not assume every desktop Unreal rendering feature is available in a browser; the experimental desktop renderer tier is distinct from the mobile forward/deferred tiers.

## 4. Build, cook, and package

Packaging includes several operations:

- **Build:** compile and link the game's code for Wasm.
- **Cook:** convert assets and shaders for the target platform.
- **Stage and package:** assemble the browser runtime, content containers, manifests, and compressed files.
- **Archive:** copy the finished export into the output directory you selected.

### From Unreal Editor

1. Select **Shipping** as the packaging build configuration for the public demo. If the platform uses the project configuration, set it under **Project Settings > Packaging > Build Configuration**.
2. Choose **Platforms > Wasm > Package Project**.
3. Select an output directory. For this project, the repository is the output parent directory:

   ```text
   D:\Unreal Projects\TPPWeb590\Build
   ```

   The archive contains a `Wasm` subfolder, so do not select `Build\Wasm` if that would create a nested `Wasm\Wasm` export.
4. Wait for packaging to finish and check the Output Log for errors. The first compilation, shader cook, and Wasm link can take considerably longer than later builds.

The editor also offers a local browser launch under **Platforms > Wasm** / **Quick Launch** for iteration. Use a Shipping package for the public export.

### Equivalent command-line package

This **PowerShell** command builds and packages the original project. Change the engine, project, and archive paths for your machine:

```powershell
& 'D:\Epic Games\UE_5.9\Engine\Build\BatchFiles\RunUAT.bat' `
    BuildCookRun `
    '-project=D:\Unreal Projects\TPPWeb590\TPPWeb590.uproject' `
    -platform=Wasm `
    -clientconfig=Shipping `
    -build -cook -stage -pak -iostore -package `
    -archive `
    '-archivedirectory=D:\Unreal Projects\TPPWeb590\Build' `
    -unattended -utf8output
```

A PowerShell continuation backtick must be the final character on its line. Add `-run` to have UAT serve and open the result locally.

Keep `-package`: it regenerates the page, manifests, cache hashes, and Brotli copies. Replacing only a `.wasm` file can leave the export inconsistent.

### Expected output

```text
Build/
  Wasm/
    index.html
    sw.js
    wasm-*.js
    wasm-manifest.json
    wasm-cache.json
    Engine/
    TPPWeb590/
      Binaries/Wasm/
      Content/Paks/
    ...other generated files and .br copies...
  Wasm-Debug/
  Play_TPPWeb590.bat
  play-tppweb590.sh
  serve.py
```

`Wasm` is the deployable website. Keep `Wasm-Debug` locally for debugging; it is excluded from this repository. The launchers and `serve.py` are local testing tools generated by Unreal and are not required on GitHub Pages.

## 5. Test locally

### Use the generated launcher

After packaging on Windows, run `Play_TPPWeb590.bat` from the archive directory. It launches the supplied Python server and opens the browser. That server supplies the isolation headers, MIME types, and byte-range handling expected by the build.

These generated launcher files are not tracked here. If you cloned only this deployment repository, use the lite-server option below.

### Use lite-server

From the repository root:

```powershell
npx lite-server -c bs-config.js
```

Open the **localhost** URL printed by the server. Node.js/npm must be installed; `npx` may prompt to download lite-server on the first run.

Do not open `index.html` directly with `file://`. Wasm threads use `SharedArrayBuffer`, which requires a secure context and cross-origin isolation. HTTPS is required on a public server; localhost is suitable for local development.

The included [bs-config.js](bs-config.js) serves `Wasm` and adds:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

A default lite-server configuration does not add these headers. That explains why the generated `.bat` launcher can work while an ordinary static server stops at the browser compatibility check.

## 6. Prepare the GitHub Pages deployment

This repository is already configured. The relevant files are:

| Path | Purpose |
| --- | --- |
| `Wasm/` | Generated game export, with the large raw Wasm binary excluded from Git. |
| `.gitignore` | Excludes the raw binary, `Wasm-Debug`, `_site`, and `node_modules`. |
| `.gitattributes` | Preserves exported file bytes so Git newline conversion does not invalidate cache hashes. |
| `scripts/prepare-pages.cjs` | Restores the binary, enables isolation in the deployment copy, and verifies cached assets. |
| `.github/workflows/pages.yml` | Prepares the export and publishes it through separate build and deploy jobs. |
| `bs-config.js` | Local lite-server settings. |

The initial raw `TPPWeb590-Wasm-Shipping.wasm` is approximately **134 MiB**, exceeding GitHub's **100 MiB limit for an ordinary Git file**. Its compressed `.wasm.br` copy is approximately **24.6 MiB** and is tracked instead. The preparation script decompresses it back to the original `.wasm` before publishing. This avoids putting the oversized file in Git history. See [GitHub's file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

Do not delete the `.wasm.br` file or force-add the ignored raw `.wasm`. Preserve the rest of the generated export and its relative folder structure. A larger future project may need different hosting if it exceeds [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

For a new repository using this setup:

1. Copy the exported `Wasm` folder and the deployment configuration listed above into the repository root. Add `.gitignore` before the first commit.
2. If the project has a different name or binary filename, update the Wasm path in `scripts/prepare-pages.cjs` and the matching exclusion in `.gitignore`. They currently target `TPPWeb590-Wasm-Shipping.wasm` specifically.
3. Push the files to the repository's `main` branch using Git or GitHub Desktop.
4. In GitHub, select **Settings > Pages > Build and deployment > Source > GitHub Actions**.
5. Enable **Enforce HTTPS**. If the first workflow ran before Pages was enabled, rerun it after saving the setting.
6. Check the **Actions** tab and wait for both `build` and `deploy` to succeed.

GitHub Pages does not interpret the export's `_headers` file as server configuration. This setup uses the built-in Wasm service worker fallback instead. An initial reload while it establishes isolation is expected.

The published URL is shown in **Settings > Pages**. For this account, the existing custom domain makes it **https://www.tsiliopoulos.com/TPPWeb590/**. Other accounts normally use `https://USERNAME.github.io/REPOSITORY/` unless they have configured a custom domain.

## 7. Publish an updated build

1. Make your changes in the original Unreal project.
2. Package a new **Shipping** export into the same archive directory, or copy a complete fresh export into this repository's `Wasm` folder. Remove obsolete export files when replacing a build so they do not remain in the deployed site.
3. From the repository root, prepare and verify it:

   ```powershell
   node scripts/prepare-pages.cjs
   ```

   The script creates `_site`, reconstructs the Wasm binary from Brotli, enables isolation in its page, refreshes the page's compressed copy, and checks every asset in `wasm-cache.json` against its recorded size and SHA-1. Do not publish if it reports an integrity error.
4. Test the build locally, then commit and push the updated export:

   ```powershell
   git add Wasm
   git status
   git commit -m "Update Wasm game build"
   git push origin main
   ```

5. Wait for the workflow to succeed, then reload the public game and test it.

GitHub Actions **does not compile Unreal**. Its `build` job prepares the committed export using Node.js 22 and uploads `_site`. The dependent `deploy` job publishes that artifact. Artifact names include the run ID and attempt number to avoid collisions when a run is retried. `_site` is ignored by Git and is the only directory published to Pages.

The site loading successfully is separate from gameplay testing: verify movement, camera control, input, sound, and level loading in the browsers and devices you intend to support.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Wasm is missing from the platform menu | Confirm the engine installation includes `Engine/Platforms/Wasm` and the web platform libraries. |
| SDK validation fails | Confirm Emscripten `6.0.10`, `WASM_EMSDK_ROOT`, and the activated `.emscripten` file. Restart the editor after changing environment variables. |
| Blueprint-only project cannot package | Add a C++ class and build the project; this Preview requires a C++ project. |
| Page says it is not cross-origin isolated | Use the supplied local server/configuration, or enable Inject isolation headers for Pages. Use HTTPS remotely and allow the service-worker reload. |
| Browser fails graphics compatibility checks | Test in Chrome or Edge with WebGPU and check the exported page's detailed message. Passing isolation does not guarantee GPU compatibility. |
| Git rejects a file over 100 MiB | Check `.gitignore` before committing. The raw Shipping `.wasm` must be excluded; its `.br` copy is reconstructed during deployment. |
| Preparation reports an asset hash mismatch | Repackage the complete export. Check for mixed builds or byte changes caused by Git newline conversion. |
| Workflow fails | Open the failed job in Actions. Check the current run's result separately from an earlier failure email. Retry the failed deploy job when appropriate; the successful build artifact can be reused. |
| Browser still shows an older build | Reload after deployment. If necessary, close old game tabs and clear this game's site data/service worker, then reopen it. This also removes locally cached data for the affected site. |

## References

The UE-specific steps were checked against the installed **UE 5.9.0 Preview, changelist 60351404** documentation and SDK configuration. Consult these files in your engine installation:

- `Engine/Platforms/Wasm/Docs/GettingStarted.md` — SDK setup, project requirements, packaging, and local testing.
- `Engine/Platforms/Wasm/Docs/Deploy.md` — static hosting, isolation, MIME types, and range requests.
- `Engine/Platforms/Wasm/Docs/Troubleshooting.md` — Preview-specific limitations and failure diagnosis.
- `Engine/Platforms/Wasm/Config/Wasm_SDK.json` — exact supported Emscripten version.
- [Emscripten installation documentation](https://emscripten.org/docs/getting_started/downloads.html).
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
