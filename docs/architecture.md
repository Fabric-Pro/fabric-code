# Fabric Code Architecture

This document provides a comprehensive overview of Fabric Code's internal architecture, including component interactions, data flows, and key design decisions.

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Breakdown](#component-breakdown)
- [Data Flow](#data-flow)
- [Memory System](#memory-system)
- [Skills System](#skills-system)
- [Permission System](#permission-system)
- [Key Concepts](#key-concepts)

---

## Overview

Fabric Code is a **CLI harness** for interacting with AI agents that use **Letta** as a persistent memory backend. Unlike session-based coding assistants, Fabric Code maintains agent state across sessions, enabling learning and memory persistence.

### Key Distinction

| Component | What It Is | Role |
|-----------|------------|------|
| **Fabric Code** | This repository - a CLI application | User interface, tool execution, permissions |
| **Letta Client SDK** | `@letta-ai/letta-client` npm package | API client for communicating with Letta |
| **Letta API** | Cloud service at `app.letta.com` | Agent state, memory storage, LLM orchestration |

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Terminal                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fabric Code CLI                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   CLI    │  │  Agent   │  │  Tools   │  │   Permissions    │ │
│  │  Layer   │  │  Layer   │  │  Layer   │  │      Layer       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ @letta-ai/letta-client
┌─────────────────────────────────────────────────────────────────┐
│                      Letta API Server                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Agent State  │  │ Memory Blocks│  │    LLM Orchestration   │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              LLM Providers (Claude, GPT, Gemini, etc.)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "User Interface"
        CLI[CLI Entry Point<br/>src/index.ts]
        TUI[Terminal UI<br/>src/cli/App.tsx]
        Headless[Headless Mode<br/>src/headless.ts]
    end

    subgraph "Agent Layer"
        Client[Letta Client<br/>src/agent/client.ts]
        Create[Agent Creation<br/>src/agent/create.ts]
        Message[Message Handler<br/>src/agent/message.ts]
        Memory[Memory Manager<br/>src/agent/memory.ts]
        Skills[Skills Manager<br/>src/agent/skills.ts]
    end

    subgraph "Tools Layer"
        Manager[Tool Manager<br/>src/tools/manager.ts]
        Toolset[Toolset Selector<br/>src/tools/toolset.ts]
        Impl[Tool Implementations<br/>src/tools/impl/]
    end

    subgraph "Permissions Layer"
        Checker[Permission Checker<br/>src/permissions/checker.ts]
        Loader[Permission Loader<br/>src/permissions/loader.ts]
        Session[Session Permissions<br/>src/permissions/session.ts]
    end

    subgraph "Settings"
        SettingsMgr[Settings Manager<br/>src/settings-manager.ts]
        GlobalSettings[~/.fabric/settings.json]
        ProjectSettings[.fabric/settings.json]
        LocalSettings[.fabric/settings.local.json]
    end

    subgraph "External Services"
        LettaSDK["@letta-ai/letta-client"]
        LettaAPI[Letta API Server]
    end

    CLI --> TUI
    CLI --> Headless
    TUI --> Message
    Headless --> Message
    Message --> Client
    Client --> LettaSDK
    LettaSDK --> LettaAPI
    
    TUI --> Manager
    Manager --> Checker
    Manager --> Impl
    Checker --> Loader
    Loader --> SettingsMgr
    SettingsMgr --> GlobalSettings
    SettingsMgr --> ProjectSettings
    SettingsMgr --> LocalSettings
    
    Create --> Memory
    Create --> Skills
    Create --> Client
```

---

## Component Breakdown

### CLI Layer (`src/cli/`)

The CLI layer handles user interaction through a React-based terminal UI (using [Ink](https://github.com/vadimdemedes/ink)).

| File | Purpose |
|------|---------|
| `App.tsx` | Main application component, orchestrates UI state and message flow |
| `components/` | UI components (Input, Messages, Dialogs, Selectors) |
| `commands/` | Slash command handlers (`/profile`, `/clear`, `/remember`, etc.) |
| `helpers/` | Utility functions for message accumulation, formatting |

### Agent Layer (`src/agent/`)

The agent layer manages communication with the Letta backend and agent lifecycle.

| File | Purpose |
|------|---------|
| `client.ts` | Creates authenticated Letta client instance |
| `create.ts` | Creates new agents with memory blocks and tools |
| `message.ts` | Sends messages to agent and handles streaming responses |
| `memory.ts` | Loads and manages memory block templates |
| `skills.ts` | Discovers and formats skills from `.skills/` directory |
| `model.ts` | Model resolution and configuration |
| `promptAssets.ts` | System prompt management |

### Tools Layer (`src/tools/`)

The tools layer defines and executes tools that the agent can invoke.

| File | Purpose |
|------|---------|
| `manager.ts` | Central tool registry, execution, and permission integration |
| `toolset.ts` | Selects appropriate toolset based on model provider |
| `impl/` | Individual tool implementations (Read, Write, Bash, etc.) |
| `definitions/` | Tool schemas and metadata |

### Permissions Layer (`src/permissions/`)

The permissions layer controls which tools can execute and with what arguments.

| File | Purpose |
|------|---------|
| `checker.ts` | Main permission decision logic |
| `loader.ts` | Loads permission rules from settings files |
| `session.ts` | Manages session-only permission grants |
| `matcher.ts` | Pattern matching for file paths and commands |
| `analyzer.ts` | Analyzes tool calls for approval context |
| `types.ts` | TypeScript type definitions |

### Settings Layer (`src/settings-manager.ts`)

Manages configuration at multiple levels:

- **Global**: `~/.fabric/settings.json` - User-wide settings
- **Project**: `.fabric/settings.json` - Shared project settings (committed)
- **Local**: `.fabric/settings.local.json` - Personal project settings (gitignored)

---

## Data Flow

### User Message Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI as CLI (App.tsx)
    participant Agent as Agent Layer
    participant Letta as Letta API
    participant LLM as LLM Provider
    participant Tools as Tool Manager
    participant Perms as Permission Checker

    User->>CLI: Enter message
    CLI->>Agent: sendMessageStream()
    Agent->>Letta: POST /agents/{id}/messages
    Letta->>LLM: Forward to model
    LLM-->>Letta: Response with tool calls

    loop For each tool call
        Letta-->>CLI: Stream tool_call event
        CLI->>Perms: checkToolPermission()

        alt Permission Denied
            Perms-->>CLI: deny
            CLI->>Letta: Send denial
        else Permission Requires Approval
            Perms-->>CLI: ask
            CLI->>User: Show approval dialog
            User->>CLI: Approve/Deny
        else Permission Allowed
            Perms-->>CLI: allow
        end

        CLI->>Tools: executeTool()
        Tools-->>CLI: Tool result
        CLI->>Letta: Send tool result
    end

    Letta-->>CLI: Stream final response
    CLI->>User: Display response
```

### Agent Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Creator as create.ts
    participant Memory as memory.ts
    participant Skills as skills.ts
    participant Letta as Letta API

    User->>CLI: Create new agent
    CLI->>Creator: createAgent()

    Creator->>Memory: getDefaultMemoryBlocks()
    Memory-->>Creator: Memory block templates

    Creator->>Skills: discoverSkills()
    Skills-->>Creator: Available skills

    loop For each memory block
        Creator->>Letta: Create block
        Letta-->>Creator: Block ID
    end

    Creator->>Letta: Create agent with blocks
    Letta-->>Creator: Agent state
    Creator-->>CLI: Agent ready
```

---

## Memory System

Fabric Code uses Letta's memory block system to maintain persistent agent state.

### Memory Block Types

```mermaid
graph TB
    subgraph "Global Blocks"
        Persona[persona<br/>Agent personality & behavior]
        Human[human<br/>User preferences & context]
    end

    subgraph "Project Blocks"
        Project[project<br/>Project-specific context]
        Skills[skills<br/>Available skill catalog]
        LoadedSkills[loaded_skills<br/>Currently active skills]
    end

    subgraph "Storage"
        GlobalDir["~/.fabric/"]
        ProjectDir[".fabric/"]
    end

    Persona --> GlobalDir
    Human --> GlobalDir
    Project --> ProjectDir
    Skills --> ProjectDir
    LoadedSkills --> ProjectDir
```

### Memory Block Details

| Block | Scope | Purpose | Editable by Agent |
|-------|-------|---------|-------------------|
| `persona` | Global | Agent's personality, coding style, behavior guidelines | Yes |
| `human` | Global | User's preferences, communication style, context | Yes |
| `project` | Project | Project-specific information, conventions, architecture | Yes |
| `skills` | Project | Catalog of available skills (read-only) | No |
| `loaded_skills` | Project | Currently loaded skill instructions | No |

### Memory Persistence

Memory blocks are stored on the Letta server and persist across sessions:

1. **On agent creation**: Blocks are initialized from `.mdx` template files
2. **During conversation**: Agent can update blocks via `memory` tool
3. **Across sessions**: Changes persist on Letta server
4. **Cross-project**: Global blocks (`persona`, `human`) are shared

---

## Skills System

Skills are reusable instruction modules that extend agent capabilities.

### Skill Discovery

```mermaid
graph LR
    subgraph "Skills Directory"
        Dir[".skills/"]
        S1["data-analysis/<br/>SKILL.MD"]
        S2["web-scraping/<br/>SKILL.MD"]
        S3["testing/<br/>SKILL.MD"]
    end

    Dir --> S1
    Dir --> S2
    Dir --> S3

    S1 --> Discovery["discoverSkills()"]
    S2 --> Discovery
    S3 --> Discovery

    Discovery --> Format["formatSkillsForMemory()"]
    Format --> Block[skills memory block]
```

### Skill File Format

fSkills are defined in `SKILL.MD` files with YAML frontmatter:

```markdown
---
name: Data Analysis
description: Analyze datasets and generate insights
category: analytics
tags: [data, pandas, visualization]
---

## Instructions

When performing data analysis...
```

### Skill Loading

1. **Discovery**: `discoverSkills()` recursively finds `SKILL.MD` files
2. **Parsing**: Extracts frontmatter metadata and content
3. **Catalog**: Formats skills into the `skills` memory block
4. **Loading**: Agent uses `Skill` tool to load specific skills into `loaded_skills`

---

## Permission System

The permission system controls tool execution to ensure safety.

### Permission Decision Flow

```mermaid
flowchart TD
    Start[Tool Execution Request] --> Deny{Check deny rules}
    Deny -->|Match| DenyResult[DENY]
    Deny -->|No match| CLI{Check CLI flags}

    CLI -->|--disallowedTools match| DenyResult
    CLI -->|No match| Mode{Check permission mode}

    Mode -->|bypassPermissions| AllowResult[ALLOW]
    Mode -->|planMode| DenyResult
    Mode -->|default| CLIAllow{Check --allowedTools}

    CLIAllow -->|Match| AllowResult
    CLIAllow -->|No match| ReadOnly{Read-only tool<br/>in working dir?}

    ReadOnly -->|Yes| AllowResult
    ReadOnly -->|No| Session{Check session rules}

    Session -->|Allow match| AllowResult
    Session -->|No match| Persisted{Check persisted rules}

    Persisted -->|Allow match| AllowResult
    Persisted -->|Ask match| AskResult[ASK]
    Persisted -->|No match| Default{Tool default}

    Default -->|Auto-allow tool| AllowResult
    Default -->|Other| AskResult
```

### Permission Rule Priority

1. **Deny rules** (highest) - Always checked first
2. **CLI `--disallowedTools`** - Command-line overrides
3. **Permission mode** - `bypassPermissions` or `planMode`
4. **CLI `--allowedTools`** - Command-line allows
5. **Working directory** - Read tools auto-allowed in project
6. **Session rules** - Temporary grants for current session
7. **Persisted rules** - Saved in settings files
8. **Tool defaults** - Built-in tool behavior

### Permission Storage

```
~/.fabric/settings.json          # Global permission rules
.fabric/settings.local.json      # Project-specific rules (gitignored)
```

Example permission configuration:

```json
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Bash(npm test*)",
      "Bash(git status)"
    ],
    "deny": [
      "Bash(rm -rf*)",
      "Write(/etc/*)"
    ],
    "ask": [
      "Write(**)"
    ]
  }
}
```

---

## Key Concepts

### Fabric Code vs Letta

Understanding the separation is crucial:

| Aspect | Fabric Code | Letta |
|--------|-------------|-------|
| **Type** | CLI application | Cloud service |
| **Runs** | Locally on your machine | Remote servers |
| **Handles** | UI, tool execution, permissions | Agent state, memory, LLM calls |
| **Storage** | Settings, local config | Agent data, memory blocks |
| **Auth** | `LETTA_API_KEY` env var | API key validation |

### Agent State Persistence

Unlike stateless coding assistants:

1. **Memory persists** - Agent remembers across sessions
2. **Learning accumulates** - Preferences and context build up
3. **Project context** - Each project can have its own agent
4. **Global knowledge** - User preferences shared across projects

### Tool Registration

Tools are registered with Letta as Python stubs:

1. **Definition**: Tools defined in TypeScript (`src/tools/impl/`)
2. **Stub generation**: Python stubs created for Letta registration
3. **Server registration**: Stubs uploaded to Letta via `upsertToolsToServer()`
4. **Execution**: When agent calls tool, Fabric Code executes locally

```mermaid
sequenceDiagram
    participant FC as Fabric Code
    participant Letta as Letta Server
    participant LLM as LLM

    Note over FC,Letta: Tool Registration (startup)
    FC->>FC: Generate Python stubs
    FC->>Letta: Upload tool definitions

    Note over FC,LLM: Tool Execution (runtime)
    LLM->>Letta: Call tool X
    Letta-->>FC: Stream tool_call event
    FC->>FC: Execute tool locally
    FC->>Letta: Return result
    Letta->>LLM: Continue with result
```

### Toolset Selection

Different LLM providers have different tool naming conventions:

| Provider | Toolset | Example Tool Names |
|----------|---------|-------------------|
| Anthropic | `anthropic` | `Read`, `Write`, `Bash` |
| OpenAI | `codex` | `read_file`, `write_file`, `shell` |
| Google | `gemini` | `ReadFile`, `WriteFile`, `Shell` |

The tool manager maps between internal names and provider-specific names.

---

## Related Documentation

- [Development Guide](./development.md) - Building, testing, and contributing
- [README](../README.md) - Getting started and usage

