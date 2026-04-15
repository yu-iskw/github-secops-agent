#!/usr/bin/env node
/**
 * Runs discover-queue with an injected `gh` subprocess (skills/CLI use this; ghclt library does not spawn gh).
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pkgRoot = path.resolve(__dirname, '..');
const api = require(path.join(pkgRoot, 'dist/index.js'));

const configPath = path.resolve(
  process.argv[2] || path.join(pkgRoot, '..', '..', '.github-secops-agent.json'),
);
const raw = fs.readFileSync(configPath, 'utf8');
const v = api.validateSecopsConfig(JSON.parse(raw));
if (!v.ok) {
  process.stderr.write(`secops: invalid config: ${v.errors.join('; ')}\n`);
  process.exit(1);
}

const gh = (args) => {
  const r = spawnSync('gh', [...args], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
};

const out = api.runDiscoverQueue(v.config, configPath, { gh });
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
