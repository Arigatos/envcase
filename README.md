# envcase

> Type-safe, framework-agnostic environment variable validation with Zod.

This monorepo contains the `envcase` package and its example apps.

## Package

| Package | Version | Description |
|---------|---------|-------------|
| [`envcase`](./packages/envcase) | 0.1.4 | Core library — published to npm |

Full documentation and API reference: [packages/envcase/README.md](./packages/envcase/README.md)

## Examples

| Example | Adapter | Notes |
|---------|---------|-------|
| [`node-express`](./examples/node-express) | `node` | Express app |
| [`vite-react`](./examples/vite-react) | `vite` + `VITE_` prefix | React SPA |
| [`vue`](./examples/vue) | `vite` + `VITE_` prefix | Vue 3 SPA |
| [`svelte`](./examples/svelte) | `vite` + `VITE_` prefix | Svelte SPA |
| [`nextjs`](./examples/nextjs) | `node` + `NEXT_PUBLIC_` prefix | App Router, split server/client env |
| [`vanilla-js`](./examples/vanilla-js) | `node` | Plain JS, no bundler |

## Development

```bash
pnpm install       # install all dependencies
pnpm build         # build the envcase package
pnpm test          # run all tests
pnpm lint          # lint the envcase package
```

## License

MIT
