<h1 align="center">Nyx Sniffer</h1>

<p align="center">
  <b>Turn a Discord user ID into a profile.</b><br>
  Word wall · activity schedule · social graph · OSINT intel tags<br>
  <sub>By rScrewed</sub>
</p>

<p align="center">
  <a href="https://ko-fi.com/rscrewed"><img alt="Get a license on Ko-fi" src="https://img.shields.io/badge/Get%20a%20license-Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white"></a>
</p>

<p align="center">
  <img alt="License key required" src="https://img.shields.io/badge/license%20key-required-red">
  <img alt="Platform: Windows" src="https://img.shields.io/badge/platform-Windows-blue">
  <img alt="JavaScript" src="https://img.shields.io/badge/language-JavaScript-yellow">
  <a href="https://www.virustotal.com/gui/file/10c8a641f43cb53a2d523811657e549e582cb230715fa579c0ca65572b3a9e7c"><img alt="VirusTotal scan" src="https://img.shields.io/badge/VirusTotal-scan-8b7cf0?logo=virustotal&logoColor=white"></a>
</p>

<p align="center">
  <img alt="Nyx scanning a target with 18 parallel workers" src="images/demo.gif" width="800">
</p>

> **🔑 A license key is required to run Nyx.** Without a valid key the tool won't start. Get one at **[ko-fi.com/rscrewed](https://ko-fi.com/rscrewed)** *before* you download or run it, see [License key](#license-key) below.

A terminal-based OSINT tool that sweeps your shared Discord servers for messages, files, and mentions tied to a target user ID. **The terminal only collects the raw data, the browser viewer it opens afterward is what actually turns that data into a profile.**

---

## What you actually get

People forget what they've put out there. Months or years of messages spread across a dozen servers add up to more than most people could recall themselves, Nyx pulls all of it into one place, and the browser viewer is what turns that raw dump into an actual profile, not a wall of text:

- **Word Wall**: the target's most-used words and phrases, sized by how often they say them. See what someone's actually about at a glance, no reading required.
- **Mentions & Ranked Mentioners**: who pings them and how often, ranked. This is their real social graph, the accounts they actually talk to, not just whoever shares a server with them. Click a name to pivot straight into everything that person's said to the target.
- **OSINT Intel badges**: messages get auto-tagged when they touch location, work/income, identity, social/platform handles, technical info, and more, so the patterns surface instead of getting buried in scroll.
- **Heatmap & Timeline**: exactly when the target is online, by hour and by month. A schedule, not a guess.
- **Filters everywhere**: by file type, server/channel, mentioner, or live search, so a huge dataset narrows down to exactly what you're after in seconds.

![Word Wall in the browser viewer (target details hidden)](images/word-wall.png)

**How much you get back scales with how much the target talks.** A quiet member you barely share a channel with will only produce a thin file. Someone active, hundreds or thousands of messages, files, and mentions, turns into a genuinely detailed picture of who they are, what they're into, who they actually know, and when they're around.

---

## ⚠️ Read this before you use it

This tool logs in as a real Discord **user account** (not a bot) and drives it programmatically to search message history, optionally across several accounts ("workers") at once to go faster. That is automation of a user account, which is against **[Discord's Terms of Service](https://discord.com/terms)**.

- **Every account you point at this tool, the main one and any worker tokens, can be disabled or permanently banned.** Do not use an account you aren't prepared to lose, and never use it on someone else's account without their knowledge.
- **You need authorization from the people you're collecting data on.** A scan doesn't just pull the target's own messages, depending on the mode, it also reads what other members posted (mentions of the target, shared channels, etc.). Only run this where you have a legitimate, consented basis to do so: your own accounts and data, explicit written permission from the target and, where relevant, the server owner, or an authorized security/investigative engagement. "I have access" is not the same as "I have permission."
- Delays, cooldowns, and rate-limit backoff are built in to reduce (not eliminate) the chance of getting flagged. They can be tuned in **Settings**, but no setting makes this safe from Discord's own detection or removes the need for consent.

If you don't have clear authorization to investigate the target and the server(s) involved, don't run this.

---

## License key

Nyx is gated behind a license key, **you need to buy one to run the tool.** On launch it checks the key's signature, expiry, and revocation status before letting a scan start; without a valid key it won't run.

### 🎁 Try it free first

No purchase needed to take it for a spin. Paste this trial key when prompted, it runs on **any machine** and is valid **through October 6, 2026**:

```
NYX1.eyJ2IjoxLCJpZCI6IjcyNGRiOWYwIiwidXNlciI6InRyaWFsIiwiaWF0IjoxNzkwMDg3NzgzNjgxLCJleHAiOjE3OTEyOTczODM2ODEsIm11bHRpIjp0cnVlfQ.4jj-ow_EDea1ttLIOMNg3A7WilAGJL-n2SK2qxnwFRjorM6QpcCKKLx1UJpAE6FhTSqSVeDJlJEe4bj7cQ7TBA
```

Like it? Grab a full key below to keep using it.

**Get a key here → [ko-fi.com/rscrewed](https://ko-fi.com/rscrewed)**

Once you have your key, either:

- Paste it in when prompted on launch (`» License key:`), or
- Drop it in `.env` to skip the prompt on every run:

```
LicenseKey=your_key_here
```

---

## Table of Contents

- [What you actually get](#what-you-actually-get)
- [License key](#license-key)
- [First-time setup](#first-time-setup)
- [Usage](#usage)
- [Navigating the UI](#navigating-the-ui)
- [Multiple accounts / workers](#multiple-accounts--workers)
- [Modes](#modes)
- [Heatmap & Timeline](#heatmap--timeline)
- [Settings](#settings)
- [Output](#output)
- [Notes](#notes)

---

## First-time setup

Nyx ships as a standalone folder, no Node.js, no installing anything. **Windows only.** It's just:

```
nyx.exe
viewer.css
workerDisplay.js
```

Keep all three in the same folder, don't move the `.exe` out on its own.

> **Scanned and clean.** The release `.exe` is checked on VirusTotal: [view the scan](https://www.virustotal.com/gui/file/10c8a641f43cb53a2d523811657e549e582cb230715fa579c0ca65572b3a9e7c).

1. **Run it.** Double-click `nyx.exe`.
2. **Enter your license key** when prompted. [Buy one on Ko-fi](https://ko-fi.com/rscrewed) if you don't have one yet. It's saved automatically once verified, so you only enter it this one time.
3. **Click through the token prompt**: paste your Discord user token and hit Enter. A `.env` file gets created next to the `.exe` and your token is saved into it, so you won't be asked again on future runs.
4. **(Optional) Add more workers for speed.** Open the `.env` file that just got created (any text editor) and, instead of the single `Token=` line, add numbered ones:

   ```
   Token1=first_discord_token
   Token2=second_discord_token
   Token3=third_discord_token
   ```

   [More workers = faster results](#multiple-accounts--workers), this is the single biggest speed lever in the whole tool.

   ![Example .env with numbered worker tokens (values hidden)](images/env.png)

That's it, next time you just run the `.exe` and it drops you straight into the start menu.

---

## Usage

Just run the executable, everything else is interactive:

```
nyx.exe
```

(double-click it, or run it from a command prompt in that folder)

From the start menu you can start a **New Scan**, **Continue** an interrupted one, **Open Viewer** on past results, or change **Settings**.

A new scan walks you through:

1. **License key / Token**: skipped automatically once they're saved in `.env` (see [First-time setup](#first-time-setup))
2. **Target ID**: the user ID to investigate
3. **Server selection**: pick specific servers by number (`1,2,3`) or press Enter to scan all
4. **Mode**: choose what to collect
5. **Heatmap**: optional activity breakdown by hour
6. **Browser viewer**: open results in a local web UI when done

> **Finding a user ID:** Enable Developer Mode in Discord settings → right-click any username → **Copy User ID**.

Scans can be interrupted (Ctrl+C) and resumed later from the start menu.

**Loading workers**: each token is checked and brought online before the scan starts:

![Loading workers](images/loading-workers.png)

**Discovering servers**: Nyx looks up the target's profile and finds the servers you both share (target details hidden):

![Discovering servers](images/discovering-servers.png)

---

## Navigating the UI

Nyx has two "screens," and they do very different jobs: the **terminal menu** collects the raw data, and the **browser viewer** is where that data actually becomes a profile.

### Terminal menu: collects the data

Everything here is number-driven, there's no arrow-key navigation. Every screen lists options as `[1]`, `[2]`, etc., you type the number (or a letter like `S` for Settings) and hit Enter, and `0` (or `b`) always backs out to the previous screen. It just runs the scan and saves files, no analysis happens here. The flow you'll walk through:

- **Start menu**: `[1]` New Scan, `[2]`/`[3]` Continue an interrupted scan or Open Viewer (only shown once you have past runs), `[S]` Settings.
- **New Scan** walks you top to bottom: license key → token (both skipped automatically once saved in `.env`) → target user ID → pick servers by number (`1,2,3` or Enter for all) → pick a mode `[1-4]` → optional heatmap → optional browser viewer.
- While a scan runs, a live status line and (with multiple workers) a pinned row per worker show progress in place, no scrolling spam.
- **Ctrl+C** at any point safely stops the scan; it resumes later from **Continue Scan** on the start menu.

### Browser viewer: builds the profile

Opens automatically when a scan finishes, or via `nyx.exe --view`. It's a normal clickable web page, and it's where the raw data the terminal collected turns into the actual profile described above:

- **Tabs across the top** switch between All / Messages / Files / Mentions / Heatmap / Timeline / Word Wall.
- **Word Wall**: the target's most frequently used words, sized by frequency; click a word to jump into Messages filtered by it.
- **Mentions tab + Ranked Mentioners sidebar**: click any user in the ranking to filter the mentions feed to only their messages, for mapping out who the target actually talks to.
- **OSINT Intel badges**: colored tags on messages that match a detection category (location, economics, identity, social, activities, technical, criminal, physical, credentials, places). Click a badge or the filter above the feed to highlight exactly what triggered it. Wordlists live in `wordlists.js` and can be edited.
- **Heatmap / Timeline tabs**: hourly and monthly activity as charts; click a month on the Timeline for a daily breakdown.
- **Sidebar** lists every server/channel scanned, click one to jump straight to it; the channel you're scrolled to auto-highlights as you go.
- **Search bar** live-filters the currently loaded messages as you type.
- **File type filters** narrow the Files tab to images, videos, audio, or other.
- **Jump links** on any message open the original in Discord.

**OSINT Intel badges, examples** *(usernames, avatars, IDs, and images blurred)*

Filtering the feed by a category shows only the messages that tripped it:

![Technical category, hardware and setup mentions](images/osint-technical.png)

![Identity category, nationality, appearance, and posted images](images/osint-identity.png)

![Places category, countries, cities, and server regions](images/osint-places.png)

![Physical category, tattoos, injuries, and other physical details](images/osint-physical.png)

#### Re-open saved results

```
nyx.exe --view
```

Picks up any output folder automatically. Pass a folder name to open a specific one:

```
nyx.exe --view Everything_username
```

If a scan was interrupted before writing JSON (e.g. a `_tmp_` folder), the viewer falls back to a paginated file browser with image/video/audio type filters:

```
nyx.exe --view _tmp_123456789
```

---

## Multiple accounts / workers

**More workers = faster results, full stop, this matters more than any other setting in the tool.** A single-token scan works through a server's message history alone; each extra worker token splits that same range across another account running in parallel, so scan time drops roughly in proportion to how many you add. If you're scanning a large or very active server and want it done quickly, adding workers is the single biggest lever you have, more than tuning delays, more than narrowing servers, more than picking a lighter mode.

To split a scan across several accounts, number your tokens instead of using a single `Token=`:

```
Token1=first_discord_token
Token2=second_discord_token
Token3=third_discord_token
```

Each token is checked with a live progress bar, then Nyx splits the message range for each active server across all workers and runs them in parallel, with a pinned status row per worker.

![Workers collecting data in parallel (target details hidden)](images/workers-collecting.png)

A few things to know:

- **This multiplies the ban risk described above**: every token used is a real account being automated.
- If a worker's account isn't a member of a server the target is in, that worker just skips it (reported as private). There's no automatic joining; join manually with that account first, or scan with a single token instead.
- If a worker gets rate limited with only a page or two of its range left, an already-finished worker will lend its connection to finish that last bit instead of making the rate-limited one sit through the full backoff.

---

## Modes

| # | Mode | Description |
|---|------|-------------|
| 1 | **Messages** | Every message the target sent across selected servers |
| 2 | **Files** | Only messages with attachments, images, videos, documents |
| 3 | **Mentions** | Every message where the target was pinged, ranked by who sends them most |
| 4 | **All** | Messages + files + mentions in one pass |

### Messages

Good starting point. Text only, fast, easy to read through.

### Files

Files shared on Discord rarely have metadata stripped, what you download is often straight from the device. Output is focused and clean.

### Mentions

Builds a ranked list of who interacts with the target the most. A solid pivot point for mapping connections and deciding who to look into next.

### All

Runs everything in one pass. Mentions are collected alongside messages so you get the full picture without running separate scans. Takes longer depending on activity level.

---

## Heatmap & Timeline

Available with **Messages** and **All** modes. Both are built and shown in the browser viewer, not the terminal.

- **Heatmap**: the top 5 most active 1-hour windows in your local timezone, plus a full 24-hour breakdown saved to `heatmap.txt` and shown as a bar chart in the viewer. Useful for profiling daily schedule.
- **Timeline**: monthly message volume over the full scanned history, shown as an interactive chart in the viewer; click a month for a daily breakdown.

Times are displayed in AM/PM format.

![Heatmap, messages per hour of day, in the viewer](images/heatmap.png)

![Timeline, monthly message volume across the scanned history](images/timeline.png)

---

## Settings

From the start menu, **Settings** lets you tune the pacing Nyx uses when talking to Discord's API:

| Setting | What it controls |
|---|---|
| Page delay | Wait between consecutive search result pages |
| 1k cooldown | Longer pause every ~1,000 messages collected |
| Server gap | Wait between finishing one server and starting the next |
| Rate limit wait | Minimum backoff after Discord returns a 429 |

These exist to reduce the chance of triggering Discord's automation detection, they don't eliminate it, and shortening them increases risk to the account(s) in use.

---

## Output

Results are saved to a folder named after the mode and username:

```
Messages_username/
Files_username/
Mentions_username/
Everything_username/
```

| File | Contents |
|------|----------|
| `messages.json` | Full message data |
| `messages.txt` | Human-readable report |
| `mentions.json` | Mention data with ranked senders |
| `mentions.txt` | Human-readable mention report |
| `heatmap.txt` | Hourly activity breakdown |
| `timeline.json` | Monthly message volume, used by the viewer |
| `files/` | Downloaded attachments |

These output folders (and `_tmp_*` in-progress scans) are git-ignored by default, don't remove that from `.gitignore` before pushing, since they can contain real personal data collected during a scan.

---

## Notes

- Rate limits are handled automatically, the tool will wait and resume without losing progress.
- The token prompt hides input. Paste and press Enter.
- Server selection lets you narrow a scan to one or a few servers, which is faster and useful for targeted investigations.
- The OSINT wordlists live in `wordlists.js` and can be edited to add or remove detection terms.

---

## Support

Nyx requires a license key to run, grab one at **[ko-fi.com/rscrewed](https://ko-fi.com/rscrewed)**.
