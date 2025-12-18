# Fabric Code

[![npm](https://img.shields.io/npm/v/@fabric-pro/fabric-code.svg?style=flat-square)](https://www.npmjs.com/package/@fabric-pro/fabric-code) [![Discord](https://img.shields.io/badge/discord-join-blue?style=flat-square&logo=discord)](https://discord.gg/fabric-pro)

Fabric Code is a memory-first coding harness, built on top of the Letta memory API. Instead of working in independent sessions, you work with a persisted agent that learns over time and is portable across models (Claude Sonnet/Opus, GPT-5, Gemini 3 Pro, GLM-4.6, and more).

> **Note:** Fabric Code is maintained by Fabric Pro. It uses the Letta memory backend for persistent agent state.

![](https://github.com/Fabric-Pro/fabric-code/blob/main/assets/fabric-code-demo.gif)

## Get started
Install the package via [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm):
```bash
npm install -g @fabric-pro/fabric-code
```
Navigate to your project directory and run `fabric` (see various command-line options in the documentation).

> [!NOTE]
> By default, Fabric Code will connect to the [Letta Developer Platform](https://app.letta.com/) (includes a free tier), which you can connect to via OAuth or setting a `LETTA_API_KEY`. You can also connect it to a [self-hosted Letta server](https://docs.letta.com/letta-code/configuration#self-hosted-server) by setting `LETTA_BASE_URL`

## Philosophy
Fabric Code is built around long-lived agents that persist across sessions and improve with use. Rather than working in independent sessions, each session is tied to a persisted agent that learns.

**Claude Code / Codex / Gemini CLI** (Session-Based)
- Sessions are independent
- No learning between sessions
- Context = messages in the current session + \`AGENTS.md\`
- Relationship: Every conversation is like meeting a new contractor

**Fabric Code** (Agent-Based)
- Same agent across sessions
- Persistent memory and learning over time (powered by Letta)
- \`/clear\` resets the session (clears current in-context messages), but memory persists
- Relationship: Like having a coworker or mentee that learns and remembers

## Agent Memory & Learning
If you're using Fabric Code for the first time, you will likely want to run the \`/init\` command to initialize the agent's memory system:
```bash
> /init
```

Over time, the agent will update its memory as it learns. To actively guide your agents memory, you can use the \`/remember\` command:
```bash
> /remember [optional instructions on what to remember]
```
Fabric Code works with skills (reusable modules that teach your agent new capabilities in a \`.skills\` directory), but additionally supports skill learning. You can ask your agent to learn a skill from its current trajectory with the command:
```bash
> /skill [optional instructions on what skill to learn]
```

## Development

For information on building, testing, and contributing to Fabric Code, see the [Development Guide](docs/development.md).

For a deep dive into how Fabric Code works internally, including component architecture, data flows, and the relationship with Letta, see the [Architecture Documentation](docs/architecture.md).

```bash
# Quick start for developers
git clone https://github.com/Fabric-Pro/fabric-code.git
cd fabric-code
bun install
bun run dev
```

## Upstream Compatibility

Fabric Code is designed to maintain compatibility with the upstream [Letta Code](https://github.com/letta-ai/letta-code) repository. Updates from upstream can be merged to bring in new features and improvements.

---

Made with 💜 by Fabric Pro
