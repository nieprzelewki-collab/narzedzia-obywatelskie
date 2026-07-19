#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const REQUIRED_SECTIONS = [
  "## Problem",
  "## Proponowana zmiana",
  "## Zakres plików",
  "## Dane i prywatność",
  "## Bezpieczeństwo",
  "## Koszt",
  "## UX i dostępność",
  "## Testy",
  "## Rollback",
  "## Decyzje ownera",
];
const REQUIRED_ROLES = ["product", "cto", "privacy", "security", "ux", "cost"];
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\b[A-Z0-9]{20}:[A-Za-z0-9_-]{20,}\b/,
  /\b(?:GEMINI|MAILGUN|CLOUDFLARE|CF|OPENAI|ANTHROPIC|AWS|TOKEN|SECRET|PASSWORD|PRIVATE_KEY)\s*=\s*['"]?[^'"\s]{8,}/i,
];

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function scanSecrets(label, text) {
  const hits = SECRET_PATTERNS.filter((rx) => rx.test(text));
  if (hits.length) fail(`${label}: wykryto wzorzec sekretu (${hits.length})`);
  else pass(`${label}: brak wzorców sekretów`);
}

function validateProposal(file) {
  const text = read(file);
  scanSecrets(path.relative(ROOT, file), text);
  for (const section of REQUIRED_SECTIONS) {
    if (!text.includes(section)) fail(`${path.relative(ROOT, file)}: brak sekcji ${section}`);
  }
  if (REQUIRED_SECTIONS.every((section) => text.includes(section))) {
    pass(`${path.relative(ROOT, file)}: komplet wymaganych sekcji`);
  }
  if (/Status:\s*(APPROVED_FOR_PROD|READY_FOR_PROD)/i.test(text)) {
    fail(`${path.relative(ROOT, file)}: proposal nie może sam zatwierdzać produkcji`);
  }
}

function validateVotes(file) {
  const text = read(file);
  scanSecrets(path.relative(ROOT, file), text);
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    fail(`${path.relative(ROOT, file)}: JSON nieparsowalny: ${error.message}`);
    return;
  }
  const votes = Array.isArray(data.votes) ? data.votes : [];
  const roles = new Set(votes.map((vote) => vote.role));
  for (const role of REQUIRED_ROLES) {
    if (!roles.has(role)) fail(`${path.relative(ROOT, file)}: brak głosu roli ${role}`);
  }
  const vetoes = votes.filter((vote) => vote.veto === true);
  const passes = votes.filter((vote) => vote.decision === "pass").length;
  const invalid = votes.filter((vote) => !["pass", "fail", "abstain"].includes(vote.decision));
  if (invalid.length) fail(`${path.relative(ROOT, file)}: nieprawidłowe decyzje: ${invalid.map((v) => v.role).join(", ")}`);
  if (!data.owner_prod_approval_required) fail(`${path.relative(ROOT, file)}: produkcja musi wymagać osobnego approval ownera`);
  if (vetoes.length) {
    if (data.final_decision !== "REJECTED") fail(`${path.relative(ROOT, file)}: veto wymaga final_decision=REJECTED`);
    else pass(`${path.relative(ROOT, file)}: veto poprawnie blokuje proposal`);
  } else if (passes >= 4 && data.final_decision === "ACCEPTED_FOR_DEV") {
    pass(`${path.relative(ROOT, file)}: głosowanie dopuszcza dev`);
  } else if (data.final_decision === "NEEDS_INFO" || data.final_decision === "PARKED" || data.final_decision === "REJECTED") {
    pass(`${path.relative(ROOT, file)}: głosowanie kończy się statusem ${data.final_decision}`);
  } else {
    fail(`${path.relative(ROOT, file)}: niespójny wynik głosowania (passes=${passes}, vetoes=${vetoes.length}, final=${data.final_decision})`);
  }
}

function collect(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(ext) && !name.startsWith("_"))
    .map((name) => path.join(dir, name));
}

const args = process.argv.slice(2).map((arg) => path.resolve(process.cwd(), arg));
const proposalFiles = args.filter((file) => file.endsWith(".md"));
const voteFiles = args.filter((file) => file.endsWith(".json"));
const proposals = proposalFiles.length ? proposalFiles : collect(path.join(ROOT, "proposals"), ".md");
const votes = voteFiles.length ? voteFiles : collect(path.join(ROOT, "votes"), ".json");

if (!proposals.length && !votes.length) {
  pass("brak aktywnych proposal/votes do walidacji");
}
for (const file of proposals) validateProposal(file);
for (const file of votes) validateVotes(file);

