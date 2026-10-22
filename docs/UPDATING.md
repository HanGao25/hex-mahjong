# Updating both versions

Edit source on the Mac. GitHub transfers source; it does not deploy automatically.

## Mac: one-command release

From the Mac terminal, run this from any directory:

```sh
"/Users/hangao/Desktop/myweb/hex-mahjong/Update Hex Mahjong.command"
```

Optionally add a commit message as one quoted argument. From a terminal with pnpm
available, `pnpm release` in the source folder does the same work.

The launcher uses this Mac's portable Node/pnpm installation when available;
otherwise it uses pnpm on PATH. If temporary tooling has been removed, install
Node 22 and pnpm 10.18.3 before retrying.

The release requires the main branch and stops on merge conflicts. It installs
locked dependencies, builds, typechecks, tests, and generates the static bot game.
After those checks pass it stages ALL non-ignored changes in the Hex Mahjong
repository, including new files and deletions, commits them if needed, and pushes
main to GitHub. Keep unrelated or unfinished game changes out of a release.

It then runs rsync to upload only the complete sibling `hex-mahjong-play/` folder
to `hgao@calys.physics.mcgill.ca:~/WWW/hex-mahjong-play/`. Deletion is limited to
that remote bot-game directory. SSH may ask for your password. The university's
public website may take up to six hours to refresh.

The surrounding website, including `games.html`, is not uploaded by this command.
The bot game works independently of the Windows server. Update Windows separately
as described below.

If a check fails, no commit, push, or upload is attempted. If push fails, the local
commit remains. If rsync fails, GitHub may already be updated and the upload may
be partial; fix the error and rerun the same command. There is no automatic rollback.

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
relying on them for unattended hosting. Windows startup remains manual.
