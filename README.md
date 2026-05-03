# Topogram Generator: express

Package-backed Topogram generator for Express API services.

## Manifest

- Generator id: `@attebury/topogram-generator-express-api`
- Surface: `api`
- Projection platform: `api`
- Package manifest: `topogram-generator.json`
- Adapter export: `index.cjs`

## Verify Locally

```bash
npm run check
```

The smoke test packs this generator, installs it beside `@attebury/topogram` in a temporary consumer project, runs `topogram check`, runs `topogram generate`, and verifies expected generated files.
