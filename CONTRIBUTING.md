# Contributing to Fabric Code

## Fork the repo

Fork the repository on GitHub by [clicking this link](https://github.com/Fabric-Pro/fabric-code/fork), then clone your fork:

```bash
git clone https://github.com/your-username/fabric-code.git
cd fabric-code
```

## Installing from source

Requirements:
* [Bun](https://bun.com/docs/installation)

### Run directly from source (dev workflow)
```bash
# install deps
bun install

# run the CLI from TypeScript sources (pick up changes immediately)
bun run dev
bun run dev -- -p "Hello world"  # example with args
```

### Build + link the standalone binary
```bash
# build bin/fabric (includes prompts + schemas)
bun run build

# expose the binary globally (adjust to your preference)
bun link

# now you can run the compiled CLI
fabric
```

Whenever you change source files, rerun `bun run build` before using the linked `fabric` binary so it picks up your edits.
