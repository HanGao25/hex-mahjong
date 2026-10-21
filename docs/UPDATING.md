# Updating both versions

Edit source on the Mac. GitHub transfers source; it does not deploy automatically.

## Mac: publish a checked source release

From the hex-mahjong folder, commit the intended changes first:

```sh
git add <the-files-you-changed>
git commit -m "Describe the game update"
pnpm release
```

`release` requires a clean source repository, installs the locked dependencies, builds,
typechecks, runs tests, generates the static website build, and pushes the current
commit to origin/main. A failed step stops the release. Do not use it on an experimental
branch you do not intend to release. It does not create commits for you.

Upload the entire sibling `hex-mahjong-play/` folder using the physics website's
normal publishing process. Upload the parent `games.html` if it changed. The website
files belong to the surrounding website workspace; they are not in this source repo.
The website's bot game runs independently of the Windows server.

## Windows: initial setup for these commands

Wait until players have finished. Stop the game server with Ctrl+C; keep the
Cloudflare tunnel running. From PowerShell:

```powershell
cd "$HOME\hex-mahjong"
git pull --ff-only origin main
pnpm.cmd update:server https://YOUR-CURRENT-HOST.trycloudflare.com
```

Replace the example address with the actual tunnel origin, without a path.
The update command installs dependencies, builds, typechecks, runs tests, restores
the public connection config, and starts the server. Leave the window open.

## Windows: later updates

Stop the game server with Ctrl+C, leaving the tunnel running, then:

```powershell
pnpm.cmd update:server
```

The public URL is saved in ignored `.local/hosting.json`, outside build output.
No local source edits are discarded. Pull uses fast-forward only and stops on
conflicts. If an install/build/check fails, the server stays stopped: resolve the
reported failure and rerun the command. There is no automatic rollback.

## Start without updating / new tunnel address

```powershell
pnpm.cmd host
```

After restarting Cloudflare, pass the newly generated address:

```powershell
pnpm.cmd host https://YOUR-NEW-HOST.trycloudflare.com
```

`host` saves that address, writes the built frontend config, sets the allowed
origins, and starts the existing build. It requires an existing successful build.
Both commands use port 2567. Restarting the game server destroys current rooms.
The tunnel must stay running and Windows must stay awake.

Scripts have been checked on macOS; verify their first run on Windows before
relying on them for unattended hosting. Website upload and Windows startup are
still manual.
