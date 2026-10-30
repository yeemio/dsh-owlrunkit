# dsh-owlrunkit

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`)
bundle that serves the **OwlCoda RunKit** skill to DSH sessions.

OwlRunKit keeps the current objective, work items, candidate identity,
verification receipts, handoffs, rework, and delivery stage in project artifacts
instead of chat memory. The skill teaches an agent to use the project-local
`owlrunkit` CLI correctly and to keep execution, evidence, and authority
separate. This bundle only makes that skill available through the DSH plugin
system: it installs instructions, not a second copy of the CLI.

## What it adds

- One Host plugin row, `dsh-owlrunkit`, which registers a skill provider on
  `ctx.skills`.
- One skill in the session catalog: `owlcoda-runkit`, with its `references/`,
  `assets/templates/`, and `agents/` resources resolved against the packaged
  copy.
- No tools, no background process, no network access, and no credential read.

The provider reports the standard packaged-provider rank (600), so a project,
custom, or user skill with the same name keeps precedence. That lets a project
pin a different RunKit revision without editing the package.

## Requirements

- DeepSeek Harness `>=0.2.1-rc.1 <0.3.0`.
- Node.js 20.19 or later (also required by the `owlrunkit` CLI).
- A project-local `owlrunkit` install for the project where the skill is used.
  The skill's own instructions cover `bootstrap`, `doctor`, receipts, and
  Project Driver commands.

## Install

From npm:

```sh
dsh plugin --profile web add dsh-owlrunkit
```

From this public source tree (pin a commit for reproducible installs):

```sh
dsh plugin --profile web add 'git+https://github.com/yeemio/dsh-owlrunkit.git#v0.24.1'
```

For local development against a checkout:

```sh
dsh plugin --profile web add 'link:/absolute/path/to/dsh-owlrunkit'
```

Select the bundle in the profile if your installer did not do it. The profile's
`package.json` lists it under `dsh.profile.bundles`; the Web Plugins page shows
it as **OwlRunKit** once active.

## Use

Once the bundle is active, `owlcoda-runkit` appears in the session skill
catalog. The model loads it when a task matches the description, or a user can
invoke it explicitly where the client supports explicit skill invocation.

The skill is deliberately conservative:

- ordinary work stays light; not every task needs RunKit evidence;
- RunKit does not decide the business meaning of a result;
- every result keeps `authorizationGranted=false` unless a different authorized
  system performs an external action;
- source acceptance, integration, deployment, live readback, and product
  acceptance remain separate.

## Versioning

The package version tracks the bundled skill revision. `dsh-owlrunkit@0.24.1`
contains the OwlCoda RunKit skill package `0.24.1`, which documents
`owlrunkit@0.24.1` and contract `0.2`. The skill and the CLI have separate
lifecycles; check the bundled skill's own version text before assuming a Core
version.

## Update and remove

```sh
dsh plugin --profile web add dsh-owlrunkit@latest   # or a git target
dsh plugin --profile web remove dsh-owlrunkit
```

If a user or project skill with the same name exists, remove or update it to
observe a change made inside this package.

## License

This package and the bundled skill copy are `MIT-0`; see `LICENSE` and
`assets/LICENSE`. The `owlrunkit` CLI is a separate work under
`GPL-3.0-or-later`. The repository root's GPL license does not override the
MIT-0 grant for this directory.
