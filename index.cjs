const manifest = require("./topogram-generator.json");

function renderPackageJson() {
  return `${JSON.stringify({
    private: true,
    type: "module",
    scripts: { dev: "tsx src/index.ts", check: "tsc --noEmit", start: "node dist/index.js" },
    dependencies: { express: "^5.1.0" },
    devDependencies: { "@types/express": "^5.0.0", "@types/node": "^22.10.2", tsx: "^4.19.2", typescript: "^5.6.3" }
  }, null, 2)}\n`;
}

function renderTsconfig() {
  return `${JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, esModuleInterop: true, skipLibCheck: true, outDir: "dist" }, include: ["src/**/*.ts"] }, null, 2)}\n`;
}

function routePath(path) { return String(path || "/").replace(/:([A-Za-z0-9_]+)/g, ":$1"); }
function success(route) { return Number(route.success || route.successStatus || 200); }

function renderIndexTs(projection, component) {
  const routes = (projection.http || []).map((route) => {
    const method = String(route.method || "GET").toLowerCase();
    return `app.${method}("${routePath(route.path)}", (req, res) => res.status(${success(route)}).json({
  ok: true,
  capability: "${route.capabilityId}",
  input: {
    params: req.params,
    query: req.query,
    body: req.body ?? null
  }
}));`;
  }).join("\n");
  const port = Number(component && component.port || 3000);
  return `import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "${projection.id}" }));
app.get("/ready", (_req, res) => res.json({ ok: true, ready: true, service: "${projection.id}" }));
${routes}

const port = Number(process.env.PORT || ${port});
app.listen(port, () => {
  console.log("${projection.id} listening on http://localhost:" + port);
});
`;
}

function generate(context) {
  const projection = context.projection;
  if (!projection || !Array.isArray(projection.http)) throw new Error("@attebury/topogram-generator-express-api requires an API projection with http routes.");
  return {
    files: {
      "package.json": renderPackageJson(),
      "tsconfig.json": renderTsconfig(),
      "src/index.ts": renderIndexTs(projection, context.component || {}),
      "src/lib/topogram/server-contract.json": `${JSON.stringify(context.contracts?.server || { projection }, null, 2)}\n`,
      "src/lib/topogram/api-contracts.json": `${JSON.stringify(context.contracts?.api || {}, null, 2)}\n`,
      "README.md": `# ${context.component?.id || "Express API"}\n\nGenerated Express API service for projection \`${projection.id}\`.\n\nRun \`npm run check\` to type-check the generated service.\n`
    },
    artifacts: { generator: manifest.id, projection: projection.id, routeCount: projection.http.length },
    diagnostics: []
  };
}

module.exports = { manifest, generate };
