/**
 * End-to-end MCP protocol test.
 *
 * Spawns the built server over stdio and points the TypeSafe SDK at a local
 * mock upstream, so the full path is exercised without a real API key and
 * without spending anything.
 */
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const SERVER_ENTRY = fileURLToPath(new URL("../dist/index.js", import.meta.url));
/** Read from disk on purpose: a hard-coded copy here would defeat the check. */
const PACKAGE_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
const FAKE_KEY = "test-key-do-not-use-abc123";

const UPSTREAM_RESPONSE = {
  model: "jev-1.13.0",
  answers: {
    intent: {
      type: "choice",
      choice: "billing",
      confidence: 0.91,
      probabilities: { auth: 0.04, billing: 0.93, other: 0.03 },
    },
    refund: { type: "noul", noul: 0.88 },
  },
  usage: { input_tokens: 120, output_tokens: 0 },
};

/** Requests the mock upstream saw, for asserting what the bridge forwarded. */
let received = [];
let mode = "ok";
let upstream;
let baseURL;

function startUpstream() {
  return new Promise((resolve) => {
    upstream = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        received.push({
          url: req.url,
          auth: req.headers.authorization,
          body: body ? JSON.parse(body) : undefined,
        });
        if (mode === "unauthorized") {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "invalid api key" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(UPSTREAM_RESPONSE));
      });
    });
    upstream.listen(0, "127.0.0.1", () => {
      baseURL = `http://127.0.0.1:${upstream.address().port}`;
      resolve();
    });
  });
}

let client;
let transport;

describe("jev-agent-toolkit MCP server", () => {
  before(async () => {
    await startUpstream();
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER_ENTRY],
      env: {
        PATH: process.env.PATH ?? "",
        SystemRoot: process.env.SystemRoot ?? "",
        TYPESAFE_API_KEY: FAKE_KEY,
        TYPESAFE_BASE_URL: baseURL,
      },
    });
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  });

  after(async () => {
    await client?.close();
    upstream?.close();
  });

  it("starts and completes the MCP handshake", () => {
    assert.ok(client);
  });

  it("reports the package version as serverInfo, not a hard-coded literal", () => {
    const serverInfo = client.getServerVersion();
    assert.ok(serverInfo, "the legacy handshake requires the server to identify itself");
    assert.equal(serverInfo.name, "jev-agent-toolkit");
    assert.match(PACKAGE_VERSION, /^\d+\.\d+\.\d+/, "package.json must carry a real version");
    assert.equal(
      serverInfo.version,
      PACKAGE_VERSION,
      "serverInfo must track package.json so a published version cannot drift from the handshake",
    );
  });

  it("still serves a legacy-era client (this client negotiates 'legacy' by default)", () => {
    // serveStdio pins one era per connection and serves both from the same
    // factory. The modern path is asserted separately below.
    assert.equal(client.getNegotiatedProtocolVersion(), "2025-11-25");
  });

  it("exposes exactly one tool, jev_evaluate", async () => {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "jev_evaluate");
    assert.ok(tools[0].inputSchema, "tool must advertise an input schema");
  });

  it("advertises no tool that takes a URL or runs code", async () => {
    const { tools } = await client.listTools();
    const serialized = JSON.stringify(tools).toLowerCase();
    for (const forbidden of ["\"url\"", "endpoint", "baseurl", "command", "shell", "exec"]) {
      assert.equal(serialized.includes(forbidden), false, `tool surface must not expose ${forbidden}`);
    }
  });

  it("forwards a valid batched request and returns structured answers", async () => {
    received = [];
    mode = "ok";

    const result = await client.callTool({
      name: "jev_evaluate",
      arguments: {
        state: { subject: "Charged twice", body: "Please refund me." },
        questions: {
          intent: {
            type: "choice",
            instructions: "Which subsystem?",
            criteria: { auth: "Login.", billing: "Invoices.", other: null },
          },
          refund: { type: "noul", instructions: "Asking for a refund?" },
        },
      },
    });

    assert.notEqual(result.isError, true);
    assert.equal(result.structuredContent.model, "jev-1.13.0");
    assert.equal(result.structuredContent.answers.intent.choice, "billing");
    assert.equal(result.structuredContent.answers.refund.noul, 0.88);
    assert.equal(result.structuredContent.usage.input_tokens, 120);

    // The bridge hit the documented endpoint with bearer auth, and sent both
    // questions in ONE upstream request.
    assert.equal(received.length, 1);
    assert.equal(received[0].url, "/v1/systemone");
    assert.equal(received[0].auth, `Bearer ${FAKE_KEY}`);
    assert.equal(Object.keys(received[0].body.questions).length, 2);
  });

  it("forwards an explicit model override", async () => {
    received = [];
    mode = "ok";
    await client.callTool({
      name: "jev_evaluate",
      arguments: {
        state: "x",
        questions: { q: { type: "noul", instructions: "yes?" } },
        model: "jev-1.13.0",
      },
    });
    assert.equal(received[0].body.model, "jev-1.13.0");
  });

  it("rejects an invalid question locally, without calling upstream", async () => {
    received = [];
    mode = "ok";

    let failed = false;
    try {
      const result = await client.callTool({
        name: "jev_evaluate",
        arguments: {
          state: "x",
          questions: { q: { type: "score", instructions: "?", criteria: ["only one level"] } },
        },
      });
      failed = result.isError === true;
    } catch {
      failed = true; // protocol-level validation error is equally acceptable
    }

    assert.equal(failed, true, "an invalid score must be rejected");
    assert.equal(received.length, 0, "an invalid request must never reach the upstream API");
  });

  it("maps a 401 to a tool error that never contains the API key", async () => {
    received = [];
    mode = "unauthorized";

    const result = await client.callTool({
      name: "jev_evaluate",
      arguments: { state: "x", questions: { q: { type: "noul", instructions: "yes?" } } },
    });

    assert.equal(result.isError, true);
    const text = JSON.stringify(result);
    assert.equal(text.includes(FAKE_KEY), false, "the API key must never be returned to the host");
    assert.equal(text.toLowerCase().includes("authentication"), true);

    mode = "ok";
  });
});

/**
 * The entry point uses serveStdio, which negotiates the modern protocol
 * revision. Hand-wiring a StdioServerTransport instead pins every connection
 * to the 2025 era, where server/discover does not exist — these assertions
 * fail loudly if anyone reverts that.
 *
 * Version negotiation is opt-in on the client (mode defaults to 'legacy'),
 * so this connection asks for it explicitly.
 */
describe("modern protocol era over stdio", () => {
  let modernClient;
  let modernTransport;

  before(async () => {
    modernTransport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER_ENTRY],
      env: {
        PATH: process.env.PATH ?? "",
        SystemRoot: process.env.SystemRoot ?? "",
        TYPESAFE_API_KEY: FAKE_KEY,
        // Never contacted: these assertions exercise the handshake only.
        TYPESAFE_BASE_URL: "http://127.0.0.1:1",
      },
    });
    modernClient = new Client(
      { name: "test-client-modern", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } },
    );
    await modernClient.connect(modernTransport);
  });

  after(async () => {
    await modernClient?.close();
  });

  it("negotiates the 2026-07-28 protocol revision", () => {
    assert.equal(modernClient.getNegotiatedProtocolVersion(), "2026-07-28");
  });

  it("answers server/discover, which exists only on the modern era", async () => {
    const result = await modernClient.discover();
    assert.ok(result, "server/discover must return a result");
    assert.ok(
      Array.isArray(result.supportedVersions) && result.supportedVersions.length > 0,
      "discover must advertise supported versions",
    );
    assert.equal(result.supportedVersions.includes("2026-07-28"), true);
  });

  it("records a discover result, proving a modern rather than legacy verdict", () => {
    assert.notEqual(modernClient.getDiscoverResult(), undefined);
  });

  it("exposes the same single tool on the modern era", async () => {
    const { tools } = await modernClient.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "jev_evaluate");
  });
});
