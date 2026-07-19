#!/usr/bin/env node
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const CONFIG_PATH = path.join(ROOT, ".np-civic.json");

function readText(file, fallback = "") {
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return fallback;
  }
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function localVersion() {
  const config = readConfig();
  return readText(path.join(ROOT, config.version_file || "VERSION"), "0.0.0");
}

function usage() {
  console.log(`np-civic ${localVersion()}

Komendy:
  status                         pokaż stan lokalnego skilla i governance
  update-check [--quiet]         sprawdź, czy jest nowsza wersja skilla
  update                         pokaż bezpieczną instrukcję aktualizacji
  validate [plik...]             uruchom governance_check.mjs
  proposal <slug>                utwórz proposal z szablonu
  vote <slug>                    utwórz plik głosowania z szablonu

Zasada: CLI informuje i waliduje. Nie robi auto-update, nie deployuje produkcji, nie rusza sekretów.`);
}

function compareVersions(a, b) {
  const pa = String(a).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = String(b).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 5000, headers: { "User-Agent": "np-civic-tools" } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve(body.trim()));
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

async function updateCheck({ quiet = false } = {}) {
  const config = readConfig();
  const remoteUrl = process.env.NP_CIVIC_REMOTE_VERSION_URL || config.remote_version_url;
  if (!remoteUrl) {
    if (!quiet) {
      console.log(`np-civic: lokalnie v${localVersion()}`);
      console.log("Brak remote_version_url. Po publikacji GitHuba ustaw go w .np-civic.json.");
    }
    return 0;
  }
  try {
    const remote = await fetchText(remoteUrl);
    const local = localVersion();
    if (compareVersions(local, remote) < 0) {
      console.log(`np-civic: dostępna aktualizacja v${local} -> v${remote}`);
      console.log("Uruchom: npm run np-civic -- update");
      return 2;
    }
    if (!quiet) console.log(`np-civic: aktualne v${local}`);
    return 0;
  } catch (error) {
    if (!quiet) console.error(`np-civic: nie udało się sprawdzić aktualizacji: ${error.message}`);
    return 1;
  }
}

function status() {
  const config = readConfig();
  console.log(`np-civic: v${localVersion()}`);
  console.log(`Root: ${ROOT}`);
  console.log(`Policy: ${config.update_policy || "notify-only"}`);
  console.log(`Remote version: ${config.remote_version_url || "(nieustawione)"}`);
  console.log("Prod deploy: ręczny gate Piotra/@cto");
}

function runValidate(args) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/governance_check.mjs"), ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });
  return result.status || 0;
}

function copyTemplate(kind, slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error("Podaj slug w formacie lowercase-kebab-case, np. turnstile-antybot.");
    return 1;
  }
  const today = new Date().toISOString().slice(0, 10);
  const source = path.join(ROOT, kind, "_TEMPLATE" + (kind === "proposals" ? ".md" : ".json"));
  const target = path.join(ROOT, kind, `${today}_${slug}${kind === "proposals" ? ".md" : ".json"}`);
  if (fs.existsSync(target)) {
    console.error(`Plik już istnieje: ${path.relative(ROOT, target)}`);
    return 1;
  }
  fs.copyFileSync(source, target);
  console.log(`Utworzono: ${path.relative(ROOT, target)}`);
  return 0;
}

function updateInstructions() {
  const config = readConfig();
  console.log("np-civic update jest celowo manualny.");
  console.log("");
  console.log("Bezpieczny flow:");
  console.log("1. git fetch origin");
  console.log("2. git log --oneline --decorate HEAD..origin/main");
  console.log("3. git diff --stat HEAD..origin/main");
  console.log("4. git pull --ff-only");
  console.log("5. npm run check");
  console.log("");
  console.log("Nie uruchamiaj prod deployu po update bez osobnej zgody ownera.");
  if (!config.repository_url) {
    console.log("Repo URL nie jest jeszcze ustawiony w .np-civic.json.");
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return 0;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    console.log(localVersion());
    return 0;
  }
  if (command === "status") {
    status();
    return 0;
  }
  if (command === "update-check") {
    return updateCheck({ quiet: args.includes("--quiet") });
  }
  if (command === "update") {
    updateInstructions();
    return 0;
  }
  if (command === "validate") {
    return runValidate(args);
  }
  if (command === "proposal") {
    return copyTemplate("proposals", args[0]);
  }
  if (command === "vote") {
    return copyTemplate("votes", args[0]);
  }
  console.error(`Nieznana komenda: ${command}`);
  usage();
  return 1;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
