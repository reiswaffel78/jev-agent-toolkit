#!/usr/bin/env node
/**
 * Repository validation: Agent Skills frontmatter, internal links, and a
 * committed-secret scan. Run with `node scripts/validate.mjs`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_DIR = join(ROOT, "skills", "jev-agent-toolkit");

const failures = [];
const checks = [];

const fail = (m) => failures.push(m);
const pass = (m) => checks.push(m);

/** Spec-defined frontmatter fields. Anything else is not portable. */
const ALLOWED_KEYS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);

/**
 * Remove fenced and inline code before scanning for links. Without this,
 * expressions like `handlers[key](arg)` parse as markdown links.
 */
function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "__pycache__"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// --- 1. SKILL.md frontmatter -------------------------------------------------

const skillPath = join(SKILL_DIR, "SKILL.md");
if (!existsSync(skillPath)) {
  fail("skills/jev-agent-toolkit/SKILL.md is missing");
} else {
  const raw = readFileSync(skillPath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    fail("SKILL.md has no YAML frontmatter block");
  } else {
    const [, front, body] = match;
    const fields = {};
    for (const line of front.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s?(.*)$/);
      if (m) fields[m[1]] = m[2];
    }

    for (const key of Object.keys(fields)) {
      if (!ALLOWED_KEYS.has(key)) {
        fail(`SKILL.md frontmatter has non-portable field "${key}"`);
      }
    }

    const name = fields.name;
    if (!name) fail("SKILL.md frontmatter is missing required field: name");
    else {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
        fail(`name "${name}" must be lowercase alphanumeric with single hyphens`);
      if (name.length < 1 || name.length > 64) fail(`name must be 1-64 chars, got ${name.length}`);
      if (name !== "jev-agent-toolkit")
        fail(`name "${name}" must match the skill directory name "jev-agent-toolkit"`);
      else pass(`name "${name}" is valid and matches its directory`);
    }

    const description = fields.description;
    if (!description) fail("SKILL.md frontmatter is missing required field: description");
    else if (description.length > 1024)
      fail(`description must be <= 1024 chars, got ${description.length}`);
    else pass(`description is ${description.length}/1024 chars`);

    if (fields.compatibility && fields.compatibility.length > 500)
      fail(`compatibility must be <= 500 chars, got ${fields.compatibility.length}`);
    else if (fields.compatibility)
      pass(`compatibility is ${fields.compatibility.length}/500 chars`);

    const lines = body.split(/\r?\n/).length;
    if (lines > 500) fail(`SKILL.md body is ${lines} lines; the spec recommends under 500`);
    else pass(`SKILL.md body is ${lines}/500 lines`);
  }
}

// --- 2. The skill directory must be self-contained ---------------------------

for (const file of walk(SKILL_DIR)) {
  const text = stripCode(readFileSync(file, "utf8"));
  for (const [, , target] of text.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    if (target.startsWith("../")) {
      fail(
        `${relative(ROOT, file)} links outside the skill directory ("${target}") — breaks when the skill is copied alone`,
      );
    }
  }
}
if (!failures.some((f) => f.includes("links outside")))
  pass("the skill directory contains no links outside itself");

// --- 3. Internal markdown links ----------------------------------------------

let linkCount = 0;
for (const file of walk(ROOT).filter((f) => f.endsWith(".md"))) {
  const text = stripCode(readFileSync(file, "utf8"));
  for (const [, , target] of text.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split("#")[0];
    if (!clean) continue;
    linkCount += 1;
    if (!existsSync(resolve(dirname(file), clean))) {
      fail(`${relative(ROOT, file)}: broken link -> ${target}`);
    }
  }
}
pass(`checked ${linkCount} relative links`);

// --- 4. Committed secrets ----------------------------------------------------

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\btsk-[A-Za-z0-9_-]{16,}/,
  /TYPESAFE_API_KEY\s*[=:]\s*["']?(?!your-key-here|\$|\{|")[A-Za-z0-9_-]{16,}/,
];

for (const file of walk(ROOT)) {
  if (/\.(png|jpg|gif|ico|woff2?|map)$/.test(file)) continue;
  // Test files carry deliberately fake credentials to prove redaction works.
  // Everything else in the repository is scanned.
  if (/[\\/]test[\\/]/.test(file)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) fail(`${relative(ROOT, file)}: possible committed secret`);
  }
}
pass("no committed secrets detected");

// --- 5. Required files -------------------------------------------------------

for (const required of ["README.md", "LICENSE", ".gitignore", ".env.example"]) {
  if (!existsSync(join(ROOT, required))) fail(`missing required file: ${required}`);
}
pass("required top-level files present");

// --- Report ------------------------------------------------------------------

for (const c of checks) console.log(`  ok    ${c}`);
for (const f of failures) console.error(`  FAIL  ${f}`);

console.log(`\n${checks.length} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
