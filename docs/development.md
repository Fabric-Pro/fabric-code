# Development Guide

This guide covers how to build, test, and publish Fabric Code.

## Prerequisites

- [Bun](https://bun.sh/) v1.3.0 or later
- [Node.js](https://nodejs.org/) v22+ (for npm publishing)
- A [Letta](https://www.letta.com/) account and API key

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Fabric-Pro/fabric-code.git
cd fabric-code

# Install dependencies
bun install

# Run in development mode
bun run dev
```

## Building

```bash
# Build the production bundle
bun run build

# Output: fabric.js (~2.5MB)
```

## Testing Locally

### Option 1: Development Mode (Recommended)

Runs TypeScript source directly with hot reloading:

```bash
bun run dev
```

### Option 2: Run Built Bundle

```bash
bun run build
node fabric.js
```

### Option 3: Link Globally

Creates a global symlink so you can run `fabric` from anywhere:

```bash
bun link

# Now use from any directory
fabric --help
fabric --version
fabric
```

### Option 4: Run Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/tests/tools/bash.test.ts

# Run with extended timeout
bun test --timeout 15000
```

## Code Quality

```bash
# Lint and type check
bun run check

# Lint only
bun run lint

# Auto-fix lint issues
bun run fix

# Type check only
bun run typecheck
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LETTA_API_KEY` | Your Letta API key | Yes (or use OAuth) |
| `LETTA_BASE_URL` | Custom Letta API URL | No |

On first run without `LETTA_API_KEY`, Fabric Code will prompt you to authenticate via OAuth.

---

## CI/CD Setup

### GitHub Actions Workflows

The repository includes two workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to main, PRs | Lint, test, build on all platforms |
| `release.yml` | Manual dispatch | Bump version and publish to npm |

### Required GitHub Secrets

Go to your repository **Settings** → **Secrets and variables** → **Actions** and add:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `LETTA_API_KEY` | Letta API key for smoke tests | [Letta Dashboard](https://app.letta.com/) |
| `NPM_TOKEN` | npm automation token | See [Creating NPM Token](#creating-npm-token) |

### Creating NPM Token

```bash
# Login to npm
npm login

# Create an automation token
npm token create --type=automation

# Copy the token and add it as NPM_TOKEN secret in GitHub
```

### NPM OIDC Publishing (Alternative)

The release workflow supports npm OIDC trusted publishing. To set this up:

1. Go to [npmjs.com](https://www.npmjs.com/) → Package Settings
2. Configure "Publishing access" → "Require two-factor authentication or an automation token"
3. Add your GitHub repository as a trusted publisher

---

## Publishing to npm

### Manual Publishing (Local)

```bash
# 1. Build the package
bun run build

# 2. Dry run to verify contents
npm publish --dry-run

# 3. Publish (requires npm login)
npm publish --access public
```

### Automated Publishing (GitHub Actions)

1. Go to **Actions** → **Bump version and release**
2. Click **Run workflow**
3. Select version bump type:
   - `patch` (0.6.3 → 0.6.4) - Bug fixes
   - `minor` (0.6.3 → 0.7.0) - New features
   - `major` (0.6.3 → 1.0.0) - Breaking changes
4. Click **Run workflow**

The workflow will:
1. Bump the version in `package.json`
2. Commit and tag the release
3. Run lint, type check, and build
4. Run smoke tests
5. Create a GitHub Release
6. Publish to npm

---

## Troubleshooting

### "LETTA_API_KEY not set"

Either set the environment variable or run `fabric` and complete OAuth authentication.

### Build fails with TypeScript errors

```bash
bun run typecheck
```

### Tests fail with timeout

```bash
bun test --timeout 30000
```

### npm publish fails with 403

- Ensure you're logged in: `npm whoami`
- Check your token has publish permissions
- Verify the package name isn't taken

---

## Package Contents

When published, the npm package includes:

```
@fabric-pro/fabric-code/
├── LICENSE
├── README.md
├── fabric.js          # Main bundle
├── package.json
├── scripts/
│   ├── check.js
│   └── postinstall-patches.js
└── vendor/
    ├── ink/
    └── ink-text-input/
```

