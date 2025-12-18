# Agent Provider Abstraction Analysis

## Executive Summary

This document analyzes the feasibility of implementing **Option 2: Full Agent Provider Abstraction** for Fabric Code, comparing multiple potential backend providers:

| Provider | Viability | Notes |
|----------|-----------|-------|
| **Letta** (current) | ✅ Full | Complete agent platform |
| **Cloudflare Stack** | ✅ Viable | Agents SDK + Durable Objects + AI Gateway |
| **Claude Agent SDK** | ✅ Viable | Full agent harness with sessions, MCP, built-in tools |
| **Mastra** | ✅ Viable | TypeScript-native with Memory, LibSQL, workflows |
| **LangGraph + Temporal** | ⚠️ Partial | Orchestration layer, requires custom persistence |
| **Anthropic SDK** | ❌ Not viable | LLM API client only |

**Key Finding**: Full agent provider abstraction is **technically feasible** with multiple viable alternatives. The **Claude Agent SDK** and **Mastra** emerge as strong TypeScript-native options, while **Cloudflare Stack** offers edge-native deployment with comprehensive infrastructure.

---

## 1. Current Architecture Assessment

### Letta Integration Depth

Fabric Code is **deeply coupled** to Letta across **41+ source files**:

```
src/agent/client.ts      - Letta client instantiation
src/agent/create.ts      - Agent creation with Letta types
src/agent/message.ts     - Message streaming via Letta
src/agent/memory.ts      - Memory block management
src/tools/manager.ts     - Tool registration with Letta
```

### What Letta Currently Provides

| Capability | Implementation | Abstraction Difficulty |
|------------|----------------|------------------------|
| Agent State | `client.agents.create/retrieve/delete` | Medium |
| Memory Blocks | `client.blocks.create/update` | Medium |
| Tool Registration | `client.tools.upsert` | High |
| Message Streaming | `client.agents.messages.stream` | Medium |
| Conversation History | Automatic persistence | Low |
| LLM Orchestration | Built-in multi-model | High |

### Existing Abstraction Patterns

**No AgentProvider abstraction exists.** The Letta client is directly instantiated:

```typescript
// src/agent/client.ts - Current implementation
import Letta from "@letta-ai/letta-client";

export async function getClient() {
  return new Letta({
    apiKey,
    baseURL,
    defaultHeaders: { "X-Letta-Source": "fabric-code" },
  });
}
```

---

## 2. Cloudflare Agents SDK Analysis

### Overview

The Cloudflare Agents SDK is built on **Durable Objects** - stateful micro-servers that persist data and maintain WebSocket connections. It provides an agent harness with built-in state management.

### Capability Assessment

| Capability | Support | Notes |
|------------|---------|-------|
| Agent State Persistence | ✅ **Full** | `this.setState()`, `this.sql` (SQLite per agent) |
| Memory Block Management | ⚠️ **Partial** | No built-in abstraction; requires custom SQLite schema |
| LLM Orchestration | ❌ **None** | BYOLLM - bring your own LLM provider |
| Tool/Function Calling | ✅ **Yes** | Via AI SDK integration |
| Message Streaming | ✅ **Full** | WebSocket-based with `AIChatAgent` |
| Conversation History | ✅ **Full** | `messages` array + `saveMessages()` |
| Multi-model Support | ✅ **Yes** | Any LLM provider (OpenAI, Anthropic, etc.) |
| Self-hosted | ❌ **No** | Cloudflare infrastructure only |

### Key Classes

```typescript
// Agent base class with state management
class Agent<Env, State> {
  setState(state: State): void;
  sql: SqlStorage;  // SQLite per agent
  schedule(callback, options): void;
}

// Chat-specific agent with message handling
class AIChatAgent<Env, State> extends Agent<Env, State> {
  messages: Message[];
  async onChatMessage(onFinish): Promise<Response>;
  async saveMessages(messages: Message[]): Promise<void>;
}
```

### Architecture Implications

**Pros:**
- Built-in state persistence via Durable Objects
- SQLite storage per agent instance
- WebSocket support for real-time streaming
- React hooks (`useAgent`, `useAgentChat`)
- Automatic resumable streaming

**Cons:**
- **No LLM orchestration** - must implement yourself
- **No memory block abstraction** - must build on SQLite
- **Cloudflare lock-in** - cannot self-host
- **No tool registration system** - tools are client-side
- Different programming model (Workers vs Node.js)

### Implementation Effort: **HIGH**

Would require:
1. Custom memory block layer on SQLite
2. LLM orchestration implementation
3. Tool registration system
4. Migration from Node.js to Cloudflare Workers

---

## 3. Claude Agent SDK Analysis (`@anthropic-ai/claude-agent-sdk`)

### Critical Clarification

There are **two different products** - this analysis covers the **full agent SDK**:

| Package | Purpose | Viability |
|---------|---------|-----------|
| `@anthropic-ai/sdk` | LLM API client only | ❌ Not viable |
| `@anthropic-ai/claude-agent-sdk` | Full agent harness | ✅ **Viable** |

### Claude Agent SDK Capabilities

| Capability | Support | Notes |
|------------|---------|-------|
| Agent State Persistence | ✅ **Yes** | Session management with `session_id` |
| Memory Block Management | ✅ **Yes** | Built-in memory tool |
| LLM Orchestration | ✅ **Yes** | Claude models (Sonnet, Opus, Haiku) |
| Tool/Function Calling | ✅ **Full** | Built-in tools + MCP integration |
| Message Streaming | ✅ **Yes** | Async iterator streaming |
| Conversation History | ✅ **Yes** | Session resume capability |
| Multi-model Support | ✅ **Yes** | Bedrock, Vertex AI, Microsoft Foundry |

### Built-in Tools

The Claude Agent SDK provides **production-ready tools**:

- `Bash` - Shell command execution
- `Read` - File reading
- `Glob` - File pattern matching
- `Grep` - Text search
- `computer` - Computer use (screenshots, mouse, keyboard)
- `web_search` - Web search capability
- `memory` - Persistent memory tool

### Session Management

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Create session
let sessionId: string | undefined;
for await (const message of query({
  prompt: "Find all TypeScript files",
  options: { allowedTools: ["Glob", "Read"] }
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
}

// Resume session (maintains context)
for await (const message of query({
  prompt: "Now analyze the imports",
  options: { resume: sessionId }
})) {
  console.log(message);
}
```

### V2 Preview API

```typescript
import { unstable_v2_createSession, unstable_v2_prompt } from '@anthropic-ai/claude-agent-sdk';

await using session = unstable_v2_createSession({
  model: 'claude-sonnet-4-5-20250929'
});

const response = await unstable_v2_prompt(session, {
  prompt: "Analyze this codebase"
});
```

### MCP (Model Context Protocol) Integration

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Use the database tool to query users",
  options: {
    mcpServers: {
      database: { command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"] }
    }
  }
})) {
  console.log(message);
}
```

### Architecture Implications

**Pros:**
- ✅ Full agent harness with built-in tools
- ✅ Session persistence and resume
- ✅ MCP integration for extensibility
- ✅ Multi-cloud support (Bedrock, Vertex, Foundry)
- ✅ Streaming via async iterators
- ✅ Permission modes for security
- ✅ Hooks for intercepting agent behavior
- ✅ Subagents support

**Cons:**
- ⚠️ Requires Claude Code installation as runtime
- ⚠️ Claude models only (no OpenAI, Gemini)
- ⚠️ Memory tool is simpler than Letta's memory blocks
- ⚠️ Newer SDK, less battle-tested

### Conclusion: **VIABLE ALTERNATIVE**

The Claude Agent SDK **can replace Letta** for:
- Session-based agent state
- Built-in tool execution
- MCP-based extensibility
- Multi-turn conversations

**Gap Analysis:**
| Letta Feature | Claude Agent SDK Equivalent |
|---------------|----------------------------|
| Memory blocks | Memory tool (simpler) |
| Tool registration | MCP servers |
| Multi-model | Claude only (but multi-cloud) |
| Self-hosted | ❌ Not available |

---

## 4. Mastra Framework Analysis

### Overview

Mastra is a **TypeScript-native agent framework** with built-in memory, tool-calling, workflows, RAG, and model routing. It provides a comprehensive solution similar to Letta but designed for TypeScript-first development.

### Capability Assessment

| Capability | Support | Notes |
|------------|---------|-------|
| Agent State Persistence | ✅ **Full** | LibSQLStore, PostgreSQL, custom storage |
| Memory Block Management | ✅ **Full** | Working memory with templates |
| LLM Orchestration | ✅ **Full** | Multi-model via AI SDK |
| Tool/Function Calling | ✅ **Full** | Native tool registration |
| Message Streaming | ✅ **Full** | `agent.stream()` |
| Conversation History | ✅ **Full** | Thread-based with `thread_id` |
| Multi-model Support | ✅ **Full** | OpenAI, Anthropic, Google, etc. |
| Self-hosted | ✅ **Yes** | Runs anywhere Node.js runs |

### Memory Architecture

Mastra provides **three types of memory**:

1. **Conversation History** - Last N messages
2. **Semantic Recall** - Vector-based retrieval of relevant past messages
3. **Working Memory** - Structured persistent state (like Letta's memory blocks)

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLStore({
    id: "agent-storage",
    url: "file:memory.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:vector.db",
  }),
  embedder: openai.embedding("text-embedding-3-small"),
  options: {
    lastMessages: 20,
    semanticRecall: { topK: 3, messageRange: { before: 2, after: 1 } },
    workingMemory: {
      enabled: true,
      template: `
# User Profile
- Name:
- Preferences:
# Session State
- Current Topic:
- Action Items:
`,
    },
  },
});

export const agent = new Agent({
  name: "MemoryAgent",
  instructions: "You are a helpful assistant with memory capabilities.",
  model: openai("gpt-4o"),
  memory: memory,
});
```

### Thread and Resource Management

```typescript
// Store information with thread isolation
const response = await agent.generate("Remember my favorite color is blue.", {
  memory: {
    resource: "user-123",  // User/entity identifier
    thread: "conversation-123",  // Conversation isolation
  },
});

// Stream with memory context
const stream = await agent.stream("What's my favorite color?", {
  memory: {
    thread: "conversation-123",
    resource: "user-123",
  },
});
```

### Architecture Implications

**Pros:**
- ✅ TypeScript-native (same as Fabric Code)
- ✅ Working memory with templates (similar to Letta memory blocks)
- ✅ LibSQL/SQLite for local storage
- ✅ Vector search for semantic recall
- ✅ Thread-based conversation isolation
- ✅ Multi-model support via AI SDK
- ✅ Self-hosted option
- ✅ Active development (Benchmark Score: 89.4)

**Cons:**
- ⚠️ Newer framework, less mature than Letta
- ⚠️ Working memory template is less structured than Letta blocks
- ⚠️ No built-in tool approval workflow

### Conclusion: **STRONG VIABLE ALTERNATIVE**

Mastra is the **closest TypeScript equivalent to Letta**:

| Letta Feature | Mastra Equivalent |
|---------------|-------------------|
| Memory blocks | Working memory templates |
| Tool registration | Native tool system |
| Multi-model | AI SDK integration |
| Conversation history | Thread-based storage |
| Self-hosted | ✅ Yes |

---

## 5. Temporal + LangGraph Orchestration Analysis

### Overview

**Temporal** provides durable execution for workflows, while **LangGraph** provides agent orchestration with checkpointing. Together they can provide a robust orchestration layer.

### Temporal Capabilities

| Capability | Support | Notes |
|------------|---------|-------|
| Workflow Persistence | ✅ **Full** | Event History |
| State Checkpointing | ✅ **Full** | Automatic |
| Long-running Processes | ✅ **Full** | Designed for this |
| Retry/Recovery | ✅ **Full** | Built-in |
| Multi-language | ✅ **Yes** | TypeScript, Python, Go, Java |

```typescript
// Temporal Workflow (deterministic, sandboxed)
import { proxyActivities } from '@temporalio/workflow';
const { processMessage } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute'
});

export async function agentWorkflow(message: string): Promise<string> {
  return await processMessage(message);
}

// Activity (normal Node.js - can call LLMs)
export async function processMessage(message: string): Promise<string> {
  const response = await openai.chat.completions.create({...});
  return response.choices[0].message.content;
}
```

### LangGraph Checkpointer

LangGraph provides **state persistence** via checkpointers:

```typescript
import { StateGraph, MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver(); // or PostgresSaver for production
const graph = workflow.compile({ checkpointer });

// Thread-based state management
const config = { configurable: { thread_id: "conversation-123" } };
await graph.invoke({ messages: [...] }, config);

// Resume from checkpoint
const state = await graph.getState(config);
```

### Combined Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Temporal Workflow                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Activity  │  │   Activity  │  │   Activity  │     │
│  │  (LangGraph │  │  (Tool Exec)│  │  (Memory)   │     │
│  │   Agent)    │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Architecture Implications

**Pros:**
- ✅ Battle-tested orchestration (Temporal)
- ✅ Durable execution with automatic recovery
- ✅ Checkpointing for state persistence
- ✅ Can integrate any LLM provider
- ✅ Self-hosted options

**Cons:**
- ⚠️ Two systems to manage (Temporal + LangGraph)
- ⚠️ No built-in memory block abstraction
- ⚠️ Higher operational complexity
- ⚠️ Requires custom integration work

### Conclusion: **PARTIAL ALTERNATIVE**

Temporal + LangGraph provides **orchestration** but not a complete agent platform:
- ✅ Good for: Complex workflows, long-running agents, reliability
- ❌ Missing: Memory blocks, tool registration, conversation management

---

## 6. Enhanced Cloudflare Stack Analysis

### Full Stack Components

The Cloudflare platform provides a **complete infrastructure stack**:

| Component | Purpose | Letta Equivalent |
|-----------|---------|------------------|
| **Agents SDK** | Agent harness | Agent lifecycle |
| **Durable Objects** | State persistence | Agent state |
| **SQLite (per DO)** | Local storage | Memory blocks |
| **AI Gateway** | Multi-model LLM | LLM orchestration |
| **Workers** | Compute | Runtime |
| **Containers** | Heavy compute | Tool execution |

### AI Gateway - Multi-Model Support

Cloudflare AI Gateway provides **unified access to 20+ LLM providers**:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_PROVIDER_API_KEY",
  baseURL: "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat",
});

// Switch providers by changing model parameter
const response = await client.chat.completions.create({
  model: "anthropic/claude-sonnet-4-5",  // or "openai/gpt-4o", "google-ai-studio/gemini-2.5-flash"
  messages: [{ role: "user", content: "Hello!" }],
});
```

**Supported Providers:**
- OpenAI, Anthropic, Google AI Studio, Google Vertex AI
- AWS Bedrock, Azure OpenAI, Groq, Mistral
- Cohere, Perplexity, DeepSeek, xAI (Grok)
- Workers AI, HuggingFace, Replicate, and more

### Dynamic Routing

```typescript
// AI Gateway dynamic routing - automatic fallback
const response = await client.chat.completions.create({
  model: "dynamic/support",  // Route name with fallback logic
  messages: [{ role: "user", content: "Help me" }],
});
```

### Updated Capability Assessment

| Capability | Support | Implementation |
|------------|---------|----------------|
| Agent State Persistence | ✅ **Full** | Durable Objects |
| Memory Block Management | ⚠️ **Custom** | SQLite per agent |
| LLM Orchestration | ✅ **Full** | AI Gateway (20+ providers) |
| Tool/Function Calling | ✅ **Yes** | Via AI SDK |
| Message Streaming | ✅ **Full** | WebSocket + AI Gateway |
| Conversation History | ✅ **Full** | SQLite storage |
| Multi-model Support | ✅ **Full** | AI Gateway routing |
| Self-hosted | ❌ **No** | Cloudflare only |

### Conclusion: **VIABLE WITH AI GATEWAY**

The Cloudflare stack becomes **significantly more viable** with AI Gateway:
- ✅ Multi-model support solved
- ✅ State persistence via Durable Objects
- ✅ Edge-native deployment
- ⚠️ Still requires custom memory block layer
- ⚠️ Cloudflare lock-in

---

## 7. Feature Parity Comparison Matrix (Updated)

| Feature | Letta | Cloudflare Stack | Claude Agent SDK | Mastra | Temporal+LangGraph |
|---------|:-----:|:----------------:|:----------------:|:------:|:------------------:|
| **State Management** |
| Agent lifecycle | ✅ | ✅ | ✅ Sessions | ✅ | ⚠️ Custom |
| Persistent state | ✅ | ✅ DO+SQLite | ✅ Sessions | ✅ LibSQL | ✅ Checkpoints |
| State sync | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Memory** |
| Memory blocks | ✅ | ⚠️ Custom | ⚠️ Memory tool | ✅ Working Memory | ⚠️ Custom |
| Memory update | ✅ | ⚠️ Custom | ✅ | ✅ | ⚠️ Custom |
| Semantic search | ✅ | ⚠️ Custom | ❌ | ✅ Vector | ⚠️ Custom |
| **LLM Integration** |
| LLM orchestration | ✅ | ✅ AI Gateway | ✅ | ✅ AI SDK | ⚠️ Custom |
| Multi-model | ✅ | ✅ 20+ providers | ⚠️ Claude only | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tools** |
| Tool registration | ✅ | ⚠️ Custom | ✅ MCP | ✅ Native | ⚠️ Custom |
| Tool execution | ✅ | ✅ | ✅ Built-in | ✅ | ✅ Activities |
| Tool approval | ✅ | ⚠️ Custom | ✅ Permissions | ⚠️ Custom | ⚠️ Custom |
| **Conversation** |
| History persistence | ✅ | ✅ | ✅ | ✅ Threads | ✅ |
| Context compaction | ✅ | ⚠️ Custom | ✅ | ✅ lastMessages | ⚠️ Custom |
| **Infrastructure** |
| Self-hosted | ✅ | ❌ | ❌ | ✅ | ✅ |
| Cloud hosted | ✅ | ✅ | ✅ | ✅ | ✅ |
| TypeScript-native | ❌ Python | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ Built-in | ⚠️ Requires custom implementation | ❌ Not available

---

## 8. Technical Feasibility Assessment

### Provider Comparison Summary

| Provider | Can Replace Letta? | Effort | Best For |
|----------|-------------------|--------|----------|
| **Cloudflare Stack** | ✅ Yes | 6-8 weeks | Edge deployment, multi-model |
| **Claude Agent SDK** | ✅ Yes | 4-6 weeks | Claude-focused, MCP ecosystem |
| **Mastra** | ✅ Yes | 3-4 weeks | TypeScript-native, self-hosted |
| **Temporal+LangGraph** | ⚠️ Partial | 8-10 weeks | Complex workflows, reliability |
| **Anthropic SDK** | ❌ No | N/A | LLM calls only |

### Detailed Gap Analysis

#### Cloudflare Stack

| Letta Feature | Cloudflare Equivalent | Gap |
|---------------|----------------------|-----|
| `client.agents.create()` | Durable Object | None |
| `client.blocks.create()` | SQLite table | **Custom schema** |
| `client.tools.upsert()` | AI SDK tools | **Custom registry** |
| `client.agents.messages.stream()` | AI Gateway + WebSocket | None |
| LLM model selection | AI Gateway routing | None |

#### Claude Agent SDK

| Letta Feature | Claude Agent SDK Equivalent | Gap |
|---------------|----------------------------|-----|
| `client.agents.create()` | `query()` with session | None |
| `client.blocks.create()` | Memory tool | **Simpler structure** |
| `client.tools.upsert()` | MCP servers | None |
| `client.agents.messages.stream()` | Async iterator | None |
| LLM model selection | Claude models only | **Single vendor** |

#### Mastra

| Letta Feature | Mastra Equivalent | Gap |
|---------------|-------------------|-----|
| `client.agents.create()` | `new Agent()` | None |
| `client.blocks.create()` | Working memory template | **Template-based** |
| `client.tools.upsert()` | Native tools | None |
| `client.agents.messages.stream()` | `agent.stream()` | None |
| LLM model selection | AI SDK providers | None |

---

## 9. Proposed AgentProvider Interface

If proceeding with abstraction, here's the recommended interface:

```typescript
interface AgentProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  // Agent Lifecycle
  createAgent(config: AgentConfig): Promise<Agent>;
  getAgent(agentId: string): Promise<Agent | null>;
  deleteAgent(agentId: string): Promise<void>;

  // Memory Management
  createMemoryBlock(agentId: string, block: MemoryBlock): Promise<string>;
  updateMemoryBlock(blockId: string, content: string): Promise<void>;
  getMemoryBlocks(agentId: string): Promise<MemoryBlock[]>;
  searchMemory?(agentId: string, query: string): Promise<MemorySearchResult[]>;

  // Tool Management
  registerTool(tool: ToolDefinition): Promise<string>;
  listTools(): Promise<ToolDefinition[]>;
  attachToolsToAgent(agentId: string, toolIds: string[]): Promise<void>;

  // Messaging
  sendMessage(agentId: string, message: Message): Promise<MessageStream>;
  getConversationHistory(agentId: string, options?: HistoryOptions): Promise<Message[]>;

  // Model Configuration
  setModel(agentId: string, model: ModelConfig): Promise<void>;
  getAvailableModels(): Promise<ModelInfo[]>;
}

interface ProviderCapabilities {
  multiModel: boolean;
  selfHosted: boolean;
  semanticSearch: boolean;
  mcpSupport: boolean;
  workingMemory: boolean;
}

interface MemoryBlock {
  id?: string;
  label: string;
  value: string;
  limit?: number;
  template?: string;  // For Mastra working memory
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  sourceCode?: string;  // For Letta Python stubs
  mcpServer?: MCPServerConfig;  // For Claude Agent SDK
}
```

---

## 10. Implementation Roadmap

### Phase 1: Interface Definition (1-2 weeks)
- [ ] Define `AgentProvider` interface
- [ ] Define common types (`Agent`, `MemoryBlock`, `Tool`, `Message`)
- [ ] Create provider factory pattern
- [ ] Define capability detection system

### Phase 2: Letta Provider (2-3 weeks)
- [ ] Implement `LettaProvider` wrapping current code
- [ ] Refactor `src/agent/client.ts` to use provider
- [ ] Update all 41+ files to use abstraction
- [ ] Maintain backward compatibility

### Phase 3: Alternative Provider (Choose One)

#### Option A: Mastra Provider (3-4 weeks) - **Recommended**
- [ ] Set up Mastra with LibSQLStore
- [ ] Map Letta memory blocks to working memory
- [ ] Implement tool registration
- [ ] Implement message streaming
- [ ] Testing and validation

#### Option B: Claude Agent SDK Provider (4-6 weeks)
- [ ] Set up Claude Agent SDK
- [ ] Implement session management
- [ ] Map memory blocks to memory tool
- [ ] Set up MCP servers for tools
- [ ] Testing and validation

#### Option C: Cloudflare Stack Provider (6-8 weeks)
- [ ] Set up Cloudflare Workers + Durable Objects
- [ ] Implement memory block layer on SQLite
- [ ] Configure AI Gateway for multi-model
- [ ] Implement tool registration system
- [ ] Testing and validation

### Phase 4: Provider Selection (1 week)
- [ ] Add configuration for provider selection
- [ ] Environment variable support
- [ ] Documentation

**Estimated Effort by Provider:**
| Provider | Total Time | Risk Level |
|----------|------------|------------|
| Mastra | 6-8 weeks | Low |
| Claude Agent SDK | 7-10 weeks | Medium |
| Cloudflare Stack | 9-12 weeks | Medium-High |

---

## 11. Recommendations

### Primary Recommendation

**Proceed with Mastra as the first alternative provider.** The analysis shows:

1. **Multiple viable alternatives exist** - Mastra, Claude Agent SDK, and Cloudflare Stack
2. **Mastra is the best fit** - TypeScript-native, self-hosted, closest feature parity
3. **Reasonable development effort** - 6-8 weeks for full abstraction with Mastra

### Provider Selection Guide

| Use Case | Recommended Provider |
|----------|---------------------|
| TypeScript-native, self-hosted | **Mastra** |
| Claude ecosystem, MCP tools | **Claude Agent SDK** |
| Edge deployment, multi-model | **Cloudflare Stack** |
| Complex workflows, reliability | **Temporal + LangGraph** |
| Current production | **Letta** (keep) |

### Decision Matrix (Updated)

| Factor | Keep Letta | Mastra | Claude SDK | Cloudflare |
|--------|:----------:|:------:|:----------:|:----------:|
| Development effort | Low | Medium | Medium | High |
| Feature completeness | High | High | Medium | Medium |
| Vendor flexibility | Low | High | Medium | Low |
| Self-hosted option | ✅ | ✅ | ❌ | ❌ |
| TypeScript-native | ❌ | ✅ | ✅ | ✅ |
| Multi-model | ✅ | ✅ | ❌ | ✅ |
| Time to implement | Now | 6-8 weeks | 7-10 weeks | 9-12 weeks |

---

## 12. Conclusion

Full agent provider abstraction is **feasible and recommended** with the following approach:

### Key Findings

1. **Multiple viable alternatives exist:**
   - **Mastra** - Best TypeScript-native option with working memory, self-hosted
   - **Claude Agent SDK** - Full agent harness with sessions, MCP, built-in tools
   - **Cloudflare Stack** - Edge-native with AI Gateway for multi-model

2. **Anthropic SDK (`@anthropic-ai/sdk`) is NOT viable** - It's an LLM client only

3. **Temporal + LangGraph** provides orchestration but not a complete agent platform

### Recommended Approach

1. **Phase 1:** Define `AgentProvider` interface (1-2 weeks)
2. **Phase 2:** Implement `LettaProvider` wrapper (2-3 weeks)
3. **Phase 3:** Implement `MastraProvider` as first alternative (3-4 weeks)
4. **Phase 4:** Add provider selection configuration (1 week)

**Total: 6-8 weeks** for Letta + Mastra dual-provider support

### Why Mastra First?

| Criteria | Mastra Advantage |
|----------|------------------|
| Language | TypeScript-native (same as Fabric Code) |
| Memory | Working memory templates ≈ Letta memory blocks |
| Storage | LibSQL/SQLite (local, self-hosted) |
| Models | Multi-model via AI SDK |
| Maturity | Active development, good documentation |

---

## Appendix: Research Sources

- [Cloudflare Agents SDK Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude Agent SDK TypeScript v2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview)
- [Mastra Documentation](https://mastra.ai/docs)
- [LangGraph Persistence](https://langchain-ai.github.io/langgraphjs/concepts/persistence/)
- [Temporal TypeScript SDK](https://docs.temporal.io/develop/typescript)
- Fabric Code codebase analysis (41+ files using `@letta-ai/letta-client`)
