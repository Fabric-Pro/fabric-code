# Mastra vs Claude Agent SDK: Deep Comparative Analysis for Fabric Code

## Executive Summary

**RECOMMENDATION: Mastra is the better choice for Fabric Code**

| Criteria | Mastra | Claude Agent SDK | Winner |
|----------|--------|------------------|--------|
| Tool Compatibility | ✅ Easy to wrap 30+ existing tools | ⚠️ Requires MCP servers | **Mastra** |
| Model Flexibility | ✅ Multi-model (Claude, GPT-4o, Gemini) | ❌ Claude only | **Mastra** |
| Memory Architecture | ✅ Working memory ≈ Letta blocks | ⚠️ Simpler memory tool | **Mastra** |
| Self-Hosted | ✅ Yes | ❌ No (requires Claude Code) | **Mastra** |
| Implementation Effort | ✅ Lower (wrap existing tools) | ⚠️ Higher (MCP servers) | **Mastra** |
| Built-in Tools | ❌ None | ✅ Bash, Read, Glob, Grep, Edit | **Claude SDK** |
| Coding Quality | ✅ Can use Claude Sonnet 4.5 | ✅ Claude Sonnet 4.5 only | **Tie** |

---

## 1. Fabric Code's Current Tool Ecosystem

### Existing Tools (30+ implementations)

Fabric Code has a **comprehensive, specialized toolset** already implemented:

#### File System Operations
- `Bash`, `BashOutput`, `Shell`, `ShellCommand`, `RunShellCommand` - Shell execution
- `Read`, `ReadFile`, `ReadFileGemini`, `ReadManyFiles` - File reading
- `Write`, `WriteFile`, `WriteFileGemini` - File writing
- `Glob`, `GlobGemini` - File pattern matching
- `LS`, `ListDir`, `ListDirectory` - Directory listing

#### Code Search & Analysis
- `Grep`, `GrepFiles`, `SearchFileContent` - Code search with ripgrep
- Supports context lines, multiline, case-insensitive, file type filtering

#### Code Editing
- `Edit` - Single file editing
- `MultiEdit` - Multi-file editing
- `Replace` - Content replacement
- `ApplyPatch` - Patch application

#### Planning & Task Management
- `Task` - Task management
- `TodoWrite`, `WriteTodos` - TODO management
- `EnterPlanMode`, `ExitPlanMode`, `UpdatePlan` - Planning mode
- `Skill` - Custom skill system

#### User Interaction
- `AskUserQuestion` - User prompts
- `KillBash` - Process management

### Tool Variants by Model
- **Anthropic toolset**: 18 tools (PascalCase)
- **OpenAI toolset**: 10 tools (snake_case)
- **Gemini toolset**: 11 tools (specialized for Gemini)

**Key Insight:** Fabric Code's tools are MORE specialized than Claude Agent SDK's built-in tools.

---

## 2. Tool Capabilities Comparison

### Claude Agent SDK Built-in Tools

| Tool | Capability | Fabric Code Equivalent |
|------|------------|------------------------|
| `Bash` | Shell execution | ✅ Bash, BashOutput, Shell, ShellCommand |
| `Read` | File reading | ✅ Read, ReadFile, ReadFileGemini, ReadManyFiles |
| `Write` | File writing | ✅ Write, WriteFile, WriteFileGemini |
| `Edit` | File editing | ✅ Edit, **MultiEdit**, **ApplyPatch**, Replace |
| `Glob` | File patterns | ✅ Glob, GlobGemini |
| `Grep` | Text search | ✅ Grep, **GrepFiles**, SearchFileContent |
| `Task` | Task management | ✅ Task, TodoWrite, UpdatePlan |
| `computer` | Computer use | ❌ Not needed for coding agent |
| `web_search` | Web search | ❌ Not currently used |
| `memory` | Memory tool | ⚠️ Simpler than Letta blocks |

**Verdict:** Claude Agent SDK has basic tools, but Fabric Code has MORE specialized variants (MultiEdit, ApplyPatch, GrepFiles, etc.)

### Mastra Built-in Tools

**NONE** - Mastra is a framework for building tools, not a batteries-included solution.

You must implement all tools using `createTool()`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const bashTool = createTool({
  id: "Bash",
  description: "Execute shell commands",
  inputSchema: z.object({ command: z.string() }),
  execute: async (input) => bash(input) // Use existing Fabric Code implementation
});
```

**Verdict:** No built-in tools, but this is FINE because Fabric Code already has 30+ specialized tools implemented.

---

## 3. Integration Complexity Analysis

### Mastra Integration Pattern

```typescript
// src/agent/providers/mastra.ts
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { createTool } from "@mastra/core/tools";
import { anthropic } from "@ai-sdk/anthropic";

// Wrap existing Fabric Code tools
import { bash } from "../../tools/impl/Bash";
import { read } from "../../tools/impl/Read";
import { grep } from "../../tools/impl/Grep";
import BashSchema from "../../tools/schemas/Bash.json";
import BashDescription from "../../tools/descriptions/Bash.md";

const bashTool = createTool({
  id: "Bash",
  description: BashDescription,
  inputSchema: BashSchema,
  execute: async (input) => bash(input)
});

// Repeat for all 30+ tools...

const agent = new Agent({
  name: "FabricAgent",
  model: anthropic("claude-sonnet-4-5"), // or openai("gpt-4o")
  tools: { Bash: bashTool, Read: readTool, Grep: grepTool, ... },
  memory: new Memory({
    storage: new LibSQLStore({ id: "fabric-memory", url: "file:memory.db" }),
    options: {
      workingMemory: { enabled: true, template: "..." }
    }
  })
});
```

**Effort:** Medium - Wrap 30+ existing tools with `createTool()`

**Pros:**
- ✅ Reuse ALL existing Fabric Code tools
- ✅ Multi-model support (Claude Sonnet 4.5, GPT-4o, Gemini 2.5)
- ✅ TypeScript-native, same as Fabric Code
- ✅ Working memory templates similar to Letta memory blocks
- ✅ Self-hosted option

**Cons:**
- ⚠️ Need to wrap each tool (but straightforward)
- ⚠️ No built-in tools (but we don't need them)

---

### Claude Agent SDK Integration Pattern

```typescript
// src/agent/providers/claude-agent.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

// Use built-in tools
for await (const message of query({
  prompt: "Fix the bug in auth.ts",
  options: {
    allowedTools: ["Bash", "Read", "Edit", "Glob", "Grep"]
  }
})) {
  console.log(message);
}

// Problem: How do we use Fabric Code's specialized tools?
// - MultiEdit (multi-file editing)
// - ApplyPatch (patch application)
// - GrepFiles (advanced grep with file filtering)
// - ReadManyFiles (batch file reading)
// - UpdatePlan (plan management)

// Solution: Implement as MCP servers
for await (const message of query({
  prompt: "Apply this patch to multiple files",
  options: {
    mcpServers: {
      fabricTools: {
        command: "node",
        args: ["./mcp-server.js"] // Custom MCP server for Fabric tools
      }
    }
  }
})) {
  console.log(message);
}
```

**Effort:** High - Build MCP servers for 20+ specialized Fabric Code tools

**Pros:**
- ✅ Built-in Bash, Read, Edit, Glob, Grep tools
- ✅ Claude Sonnet 4.5 (excellent for coding)
- ✅ Session management with resume
- ✅ Hooks for intercepting tool execution
- ✅ Permission modes for security

**Cons:**
- ❌ Claude models only (no GPT-4o, Gemini)
- ❌ Requires Claude Code runtime (not self-hosted)
- ⚠️ Must build MCP servers for specialized Fabric tools (MultiEdit, ApplyPatch, etc.)
- ⚠️ Simpler memory tool vs. Letta's memory blocks

---

## 4. Model Quality for Coding Tasks

### Claude Sonnet 4.5

**Strengths:**
- Widely regarded as one of the best models for coding tasks
- Strong at complex reasoning, code understanding, multi-step problem solving
- Extended thinking capability for complex problems
- Excellent at following instructions and tool use

**Availability:**
- Mastra: ✅ Yes (via `@ai-sdk/anthropic`)
- Claude Agent SDK: ✅ Yes (native)

### GPT-4o

**Strengths:**
- Strong coding capabilities
- Fast inference
- Good at creative problem-solving
- Multimodal (vision support)

**Availability:**
- Mastra: ✅ Yes (via `@ai-sdk/openai`)
- Claude Agent SDK: ❌ No

### Gemini 2.5 Flash

**Strengths:**
- Very fast inference
- Good coding capabilities
- Cost-effective
- Long context window

**Availability:**
- Mastra: ✅ Yes (via `@ai-sdk/google`)
- Claude Agent SDK: ❌ No

### Verdict

**Mastra wins on flexibility** - Can use Claude Sonnet 4.5 (best for coding) OR switch to GPT-4o/Gemini for specific use cases.

Claude Agent SDK is locked to Claude models only.

---

## 5. Memory Architecture Comparison

### Letta Memory Blocks (Current)

```typescript
// Letta memory blocks
{
  persona: "You are a helpful coding assistant...",
  human: "User: John Doe, Preferences: ...",
  project: "Project: fabric-code, Description: ...",
  skills: "Available skills: ...",
  loaded_skills: "Currently loaded: ..."
}
```

### Mastra Working Memory

```typescript
const memory = new Memory({
  storage: new LibSQLStore({ id: "fabric-memory", url: "file:memory.db" }),
  options: {
    workingMemory: {
      enabled: true,
      template: `
# Agent Persona
You are a helpful coding assistant...

# User Profile
- Name:
- Preferences:

# Project Context
- Project: fabric-code
- Description:

# Skills
- Available skills:
- Currently loaded:
`
    }
  }
});
```

**Similarity:** ✅ Very similar - working memory templates can replicate Letta's memory blocks

### Claude Agent SDK Memory Tool

```typescript
// Built-in memory tool (simpler)
for await (const message of query({
  prompt: "Remember that I prefer TypeScript",
  options: { allowedTools: ["memory"] }
})) {
  // Memory is stored, but less structured than Letta blocks
}
```

**Similarity:** ⚠️ Simpler - less structured than Letta's memory blocks

### Verdict

**Mastra wins** - Working memory templates provide structure similar to Letta memory blocks.

---

## 6. Self-Hosted Deployment

### Mastra

✅ **Fully self-hosted**
- Runs anywhere Node.js runs
- LibSQL/SQLite for local storage
- No external dependencies

### Claude Agent SDK

❌ **Requires Claude Code runtime**
- Must install Claude Code CLI
- Not truly self-hosted
- Depends on Anthropic infrastructure

### Verdict

**Mastra wins** - True self-hosted option for enterprise/air-gapped environments.

---

## 7. Final Recommendation

### For Fabric Code: **Choose Mastra**

#### Reasons:

1. **Tool Compatibility (Critical)**
   - Fabric Code has 30+ specialized tools already implemented
   - Mastra makes it easy to wrap existing tools with `createTool()`
   - Claude Agent SDK would require building MCP servers for specialized tools

2. **Model Flexibility**
   - Can use Claude Sonnet 4.5 (best for coding) via `@ai-sdk/anthropic`
   - Can switch to GPT-4o or Gemini for specific use cases
   - Claude Agent SDK locks you into Claude models only

3. **Memory Architecture**
   - Working memory templates replicate Letta's memory blocks
   - More structured than Claude Agent SDK's memory tool

4. **Self-Hosted**
   - True self-hosted option
   - No dependency on Claude Code runtime

5. **TypeScript-Native**
   - Same language as Fabric Code
   - Easy integration with existing codebase

6. **Implementation Effort**
   - Lower effort: Wrap existing tools vs. build MCP servers
   - Estimated: 3-4 weeks vs. 4-6 weeks for Claude Agent SDK

#### Implementation Plan:

1. **Phase 1:** Wrap 30+ Fabric Code tools with `createTool()` (1-2 weeks)
2. **Phase 2:** Implement working memory templates (1 week)
3. **Phase 3:** Integrate with existing agent lifecycle (1 week)
4. **Phase 4:** Testing and validation (1 week)

**Total: 3-4 weeks**

---

## 8. When to Consider Claude Agent SDK

Claude Agent SDK would be better if:

1. **Starting from scratch** - No existing tools to reuse
2. **Claude-only is acceptable** - Don't need multi-model flexibility
3. **Simple use case** - Built-in tools (Bash, Read, Edit, Glob, Grep) are sufficient
4. **MCP ecosystem** - Want to leverage existing MCP servers

For Fabric Code, **none of these apply** - we have 30+ specialized tools and need multi-model flexibility.

---

## Conclusion

**Mastra is the right choice for Fabric Code** because:
- ✅ Easy to reuse existing 30+ specialized tools
- ✅ Multi-model flexibility (Claude Sonnet 4.5, GPT-4o, Gemini)
- ✅ Working memory similar to Letta memory blocks
- ✅ Self-hosted option
- ✅ Lower implementation effort

Proceed with **Mastra as the first alternative provider** in the agent abstraction implementation.

