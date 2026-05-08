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
function routeCapabilityId(route) {
  const capabilityId = route.capabilityId || route.capability?.id || route.capability;
  if (!capabilityId) throw new Error("Express API generator requires each route to carry a capability id. Use the normalized server contract routes.");
  return capabilityId;
}
function routesForContext(context, projection) {
  const contractRoutes = context.contracts?.server?.routes;
  return Array.isArray(contractRoutes) && contractRoutes.length > 0
    ? contractRoutes
    : projection.endpoints || [];
}

function renderIndexTs(projection, runtime, routes) {
  const routeBlocks = routes.map((route) => {
    const method = String(route.method || "GET").toLowerCase();
    return `app.${method}("${routePath(route.path)}", (req, res) => res.status(${success(route)}).json({
  ok: true,
  capability: "${routeCapabilityId(route)}",
  input: {
    params: req.params,
    query: req.query,
    body: req.body ?? null
  }
}));`;
  }).join("\n");
  const port = Number(runtime && runtime.port || 3000);
  return `import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "${projection.id}" }));
app.get("/ready", (_req, res) => res.json({ ok: true, ready: true, service: "${projection.id}" }));
${routeBlocks}

const port = Number(process.env.PORT || ${port});
app.listen(port, () => {
  console.log("${projection.id} listening on http://localhost:" + port);
});
`;
}

function generate(context) {
  const projection = context.projection;
  const runtime = context.runtime || {};
  const routes = projection ? routesForContext(context, projection) : [];
  if (!projection || routes.length === 0) throw new Error("@topogram/generator-express-api requires an API projection with endpoints.");
  return {
    files: {
      "package.json": renderPackageJson(),
      "tsconfig.json": renderTsconfig(),
      "src/index.ts": renderIndexTs(projection, runtime, routes),
      "src/lib/topogram/server-contract.json": `${JSON.stringify(context.contracts?.server || { projection }, null, 2)}\n`,
      "src/lib/topogram/api-contracts.json": `${JSON.stringify(context.contracts?.api || {}, null, 2)}\n`,
      "README.md": `# ${runtime.id || "Express API"}\n\nGenerated Express API service for projection \`${projection.id}\`.\n\nRun \`npm run check\` to type-check the generated service.\n`
    },
    artifacts: { generator: manifest.id, projection: projection.id, routeCount: routes.length },
    diagnostics: []
  };
}

module.exports = { manifest, generate };
