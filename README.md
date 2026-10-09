# ChickenRun

A multiplayer chicken-themed runner game for up to 6 players to race and jump over obstacles. Built with Bun and vanilla JavaScript with HTML Canvas.

## Controls

- **Arrow keys** - move
- **Space** - jump / glide
- **V** - cluck
- **T** - chat

## Self-hosting

Pull and run the pre-built Docker image:

```bash
docker run -p 3000:3000 ghcr.io/kuko6/chickens
```

Or build the image yourself:

```bash
docker build -t chickens .
docker run -p 3000:3000 chickens
```

The game runs at `localhost:3000`.

### Development

Requires [Bun](https://bun.sh/).

```bash
bun install
bun run dev
```

Run the tests with `bun test`.
