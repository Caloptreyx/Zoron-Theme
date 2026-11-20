<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
    <img src="docs/logo-light.svg" alt="Zoron Theme" width="460">
  </picture>
</h1>

A theme for [Calagopus Panel](https://calagopus.com): an icon rail with your servers and folders, a full height
console workspace, a server page of its own, and **Zoron Studio**, a live theme editor.

[![Calagopus 1.2.2+](https://img.shields.io/badge/Calagopus-1.2.2%2B-3b6cde)](https://calagopus.com)
[![Latest release](https://img.shields.io/github/v/release/Caloptreyx/Zoron-Theme?label=release)](https://github.com/Caloptreyx/Zoron-Theme/releases/latest)
[![License: MIT](https://img.shields.io/github/license/Caloptreyx/Zoron-Theme)](LICENSE)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/4qjMWU7S8x)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D97757?logo=claude&logoColor=white)](https://claude.com/claude-code)

<img src="docs/cover.png" alt="Zoron Theme for Calagopus Panel" width="100%">

**[Try the demo](https://zoron-demo.caloptreyx.com)** · sign in as `demo` / `zorondemo`

</div>

## Features

- **Navigation:** an icon rail with server groups, folders, drag-and-drop organization, server tiles, and responsive mobile navigation.
- **Server views:** searchable and filterable server cards, tiles, or lists; customizable server pages; live resource metrics; and quick access to backups, schedules, and addresses.
- **Console:** a full-height terminal with live stats, quick commands, an inspector, downloadable logs, customizable terminal themes, and multiple frames.
- **Zoron Studio:** live responsive previews, drag-and-drop layouts, theme presets, color and typography controls, import/export, undo/redo, and per-tab settings.
- **Appearance:** nine presets, custom palettes, backdrops, surfaces, light mode, contrast checking, motion controls, and sign-in page links.

Open Studio from **Admin → Zoron Studio** or the extension's card on **Admin → Extensions**. Saving needs
`settings.update` or the extension's own `zoron-theme.update` admin permission.

## Screenshots

![Console workspace](docs/console.png)

| Servers | Server page |
| --- | --- |
| ![Servers page with the rail](docs/servers.png) | ![Server page](docs/server-page.png) |

| Window frame, Catppuccin | CRT frame, phosphor |
| --- | --- |
| ![Console with the window frame](docs/console-window.png) | ![Console with the CRT frame](docs/console-crt.png) |

| Zoron Studio | Studio's console settings |
| --- | --- |
| ![Zoron Studio previewing the Aurora preset](docs/studio.png) | ![Studio's Console tab](docs/studio-console.png) |

| Servers page layouts | Arranging the server page |
| --- | --- |
| ![Studio's servers page layouts, the list previewed](docs/studio-servers.png) | ![Studio's Server page tab arranging the overview's blocks](docs/studio-arrange.png) |

| Arranging the console | Servers as a list |
| --- | --- |
| ![Studio's Console tab with the figures in a bottom bar and the inspector on the left](docs/studio-console-arrange.png) | ![The servers page as a list](docs/servers-list.png) |

| Server tiles | Sign in page |
| --- | --- |
| ![Customize tile](docs/tile-editor.png) | ![Sign in page with its links](docs/login.png) |

<p align="center">
  <img src="docs/phone-console.png" alt="The console on a phone" width="300">
  <img src="docs/phone-rail.png" alt="The rail on a phone" width="300">
</p>

## Demo

https://zoron-demo.caloptreyx.com: sign in as `demo` with the password `zorondemo`. It has two Paper servers to try
the rail, folders, server tiles, the console and the server page on, and Zoron Studio to look through. Saving is
turned off there, and the demo resets every hour.

## Install

> [!NOTE]
> Requires Calagopus Panel **1.2.2** or newer.

1. Download `dev_caloptreyx_zoron.c7s.zip` from the [latest release](https://github.com/Caloptreyx/Zoron-Theme/releases/latest).
2. In the panel, open **Admin → Extensions** and install the file.
3. Restart the panel.

The extension is listed as **Zoron Theme** (`dev.caloptreyx.zoron`). To build the zip yourself, run
`python3 scripts/package.py`.

**Admin → Updates** tells you when a newer release is out, with the changes since yours (checked against this
repository's GitHub releases, at most every 10 minutes).

## Support

Need help or want to request a feature? Join the [Caloptreyx Discord](https://discord.gg/4qjMWU7S8x).

## Licence

MIT. The bundled fonts are under the SIL Open Font License, with their licence texts in `frontend/src/fonts`.
