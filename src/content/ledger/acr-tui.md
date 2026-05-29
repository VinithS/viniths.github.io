---
title: From scripts to toolbox
date: 2026-05-12
description: Scripts used to be the ceiling of what a weekend of tooling work bought you. Now it's a keyboard-driven terminal app.
tags: [vibe-coding, rust, tui, tools]
type: essay
---

I work on AWS's Agent Registry. And like every AWS console, ours is no differe. To inspect a registry, tweak a record, or kick off a lifecycle action, I federate, wait, click, wait, click, and click some more. Fifteen clicks to do the thing I just built. I spend twelve hours a day in a terminal why not more?

So I need a dev tool, one that lets me interact with my own service. I want it to be able to hit my own personal account to test, but also various stages up to production. Usually I relied on simple python scripts to query the database to get the data I needed, but those always got thrown away after a one time use.

![The acr-tui registries view](/assets/acr-tui/hero.png)

## Source of the inspiration

Two TUIs convinced me the terminal could feel like a real product: [`spotify_player`](https://github.com/aome510/spotify-player) and [`k9s`](https://k9scli.io/). One is a Spotify client; the other is a Kubernetes cluster browser. Neither looks like a script. Both made me want what they had.

<img src="/assets/acr-tui/spotify-cli.png" alt="spotify_player's threading model" style="max-width: 520px; width: 50%; display: block; margin: 20px auto;" />

First, I spent a while with an AI *reading* `spotify_player`. Learned about the threads it spins up, how they talked, why a `tokio` runtime behind `flume` channels were needed, and what work each worker actually owned. Understanding their architecture made it obvious how little of it I needed. The best thing the AI gave me here wasn't code. It was being a fast reading partner.

## What I built

Started with a simple idea: Two panes - registries and records — list on the left, detail on the right. Once the first prototype was done, then came the goodies: Vim-style navigation with chord leaders and count prefixes, bulk selections, modals, create flows backed by a JSON editor and a template picker. Multi-profile config I can edit inside the app — add a profile, rename it, switch it, able to hit my own personal endpoint without also having to deploy a personal console? Yeah now we're cooking.

![Config modal](/assets/acr-tui/config.png)

![Record detail view](/assets/acr-tui/record-detail.png)

It's a working piece of software and I'm staring to use it every day already. The toolbox starts here. More tools next weekend.

## Vibing

 Economics of AI aside, this tool has already made real impact in the industry that it's not going away. The lines of code I personally type seems to matter less every month, but planning matters more. Once you have the idea and how you're going to build it, just... prototype, prototype, prototype. Spawn two agents in parallel when the work allows: one writing source, one writing tests, set up the review loop so the agent critiques its own output before you do, get creative. Its funny rhythm that emerged by the end of the weekend was spec, plan, implement, polish, dead-code sweep. The same discipline as team code, just faster.

<img src="/assets/acr-tui/cost.png" alt="" style="max-width: 200px; display: block; margin: 10px 0 0;" />
