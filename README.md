# Chronoshell

An undo layer for Claude Code. Before Claude touches a file, it quietly captures a copy of your working tree, so afterwards you can rewind even a single step. Without losing the conversation, and without polluting your own git history.

## Why it exists

During a long session with Claude, you hit a moment like this: you notice something broke a few steps back, but you can't tell exactly which step did it. `git diff` shows you one big pile of changes and leaves you to fish out the culprit yourself. If you want to undo, it's all or nothing — there's no way to pick out a single edit and roll just that one back.

That's why a lot of people hesitate to give Claude full reign. Chronoshell exists to take that hesitation away. Every file-changing step Claude makes is recorded separately, so you can return to exactly the moment you want.

## How it works

Right before Claude runs an `Edit`, `Write`, or `Bash`, a hook kicks in and records the current state of your files. These records don't live inside your `.git` repository — they sit in a separate shadow git repository under a `.chronoshell/` folder in your project. Your commits, your staging area, your `git status` output are left untouched.

To capture each snapshot it uses git's low-level commands (`commit-tree`, `read-tree`, `update-ref`). These don't fire your own git hooks like `pre-commit`, so they never trigger anything in your setup. Steps that change nothing (a read-only `Bash` command, for example) are skipped, so the history doesn't bloat for no reason.

## Installation

There are four ways. They all reach the same result: after installing, the hook arms itself and the `/timeline` and `/rewind` commands become available. You don't have to hand-edit any config file. Below I explain what each path does and when to prefer it.

### Option 1: via npm (from the terminal, the shortest)

Use this if you want a one-line install from the terminal. It copies the plugin into the `~/.claude/skills/chronoshell/` folder. The next time Claude Code starts, it recognizes that folder automatically and loads it as `chronoshell@skills-dir`. You don't need to add a marketplace or run a separate install command.

```bash
npx chronoshell install
```

If you only want it in the project you're currently in (under `./.claude/skills/`), use:

```bash
npx chronoshell install --project
```

After installing, restart Claude Code or type `/reload-plugins` in a running session. To remove it, `npx chronoshell uninstall`.

### Option 2: via git clone (from the terminal, no marketplace)

If you'd rather not use npm, you can clone the repo straight into Claude's skills folder. Because the folder contains a `.claude-plugin/plugin.json` file, Claude Code loads it as a plugin on its own.

```bash
git clone https://github.com/Nu1lP0int/chronoshell ~/.claude/skills/chronoshell
```

If you cloned the repo somewhere else, stepping into it and running `node bin/cli.js install` does the same thing. Then again `/reload-plugins`.

### Option 3: from inside Claude Code (marketplace)

Use this if you'd rather not touch the terminal and install directly from within Claude Code. First you register the repo as a source, then you install the plugin, then you reload.

```
/plugin marketplace add Nu1lP0int/chronoshell
/plugin install chronoshell@chronoshell
/reload-plugins
```

The first line reads the catalog file in the repo and makes the plugin selectable. The second installs it. The third activates it without a restart.

### Option 4: via the terminal CLI over the marketplace (automation-friendly)

If you want to put the install in a script or wire it into a team config, you can write the marketplace into your config file and install from the `claude` command line. First add the source to `~/.claude/settings.json` (or the project's `.claude/settings.json`):

```json
{
  "extraKnownMarketplaces": {
    "chronoshell": {
      "source": { "source": "github", "repo": "Nu1lP0int/chronoshell" }
    }
  }
}
```

Then install from the terminal:

```bash
claude plugin install chronoshell@chronoshell --scope user
```

`--scope user` installs it for all your projects. `--scope project` installs it for this repo only and is shared with your team through `.claude/settings.json`.

### Trying it before installing

If you want to try it for just one session without installing at all:

```bash
git clone https://github.com/Nu1lP0int/chronoshell
claude --plugin-dir ./chronoshell
```

This loads the plugin for that session only and doesn't touch any permanent install.

## Usage

Once installed, it runs in the background on its own and you keep working with Claude as usual. When you want to rewind something, you have three commands.

`/timeline` lists the most recent snapshots. Each line shows how many steps back it is, which tool triggered it, and which file was touched. You look here first and decide where you want to return.

`/rewind` rewinds one step — it undoes the last change. To go further back, give it a number: `/rewind 3` returns to three steps earlier. During a rewind your working tree returns to that moment, but the conversation stays exactly as it is, so you don't lose what you explained.

`/rewind --diff` shows you exactly what changed between the last two snapshots. If you want to see which step broke what before rewinding, run this first.

The rewind itself is also recorded. So if you returned to the wrong moment, one more `/rewind` brings you forward again.

## What it does and doesn't do

It does not modify your git repository. Snapshots live in a separate shadow repository; your commits and `git status` output stay as they are. I verified this with tests.

The `.chronoshell/` folder doesn't show up in your `git status`. On install it's added locally to `.git/info/exclude`, which hides it without changing any tracked file.

Sensitive files don't enter the records. Files like `.env`, `*.pem`, `*.key`, `id_rsa`, `.netrc`, along with your own `.gitignore` rules, are carried over to the shadow repository, so your secrets don't leak into `.chronoshell/`. Heavy folders like `node_modules`, `.venv`, `dist` are left out too.

Even if the hook errors, it doesn't stop your flow. It always exits with a zero code, so even if something goes wrong it won't block Claude's work.

No data leaves your machine. Everything sits as local git objects; there is no network traffic.

## Requirements

The `node` and `git` commands need to be on your `PATH`. The hook spawns a separate `node` process, and the snapshot engine uses git. If either is missing, the hook silently skips and won't break your work — but rewinding won't work either. Most developers already have both installed.

In a large repo the first snapshot can take a moment, because the first scan reads every file. Later snapshots only process what changed, thanks to a persistent index, and are fast. The hook has a 30-second time limit.

It works on Windows, macOS, and Linux. The hook is defined to call `node` directly, so it doesn't trip over shell differences.

## Uninstalling

If you installed via npm, `npx chronoshell uninstall`; if into a project, `node bin/cli.js uninstall --project`. If you installed over the marketplace, `/plugin uninstall chronoshell@chronoshell`. If you cloned directly, deleting the `~/.claude/skills/chronoshell` folder is enough. After any of these, apply the change with `/reload-plugins`.

## Development and testing

The engine's behavior is checked with `node --test`: undo and redo, skipping a no-change step, leaving the user's git untouched, keeping secret files out of the records, and boundary cases.

```bash
npm test
```

The code is written as CommonJS with no external dependencies. `scripts/lib.js` holds the snapshot and rewind engine, `scripts/snapshot.js` the hook entry point, and `bin/cli.js` the terminal installer.

## License

MIT.
