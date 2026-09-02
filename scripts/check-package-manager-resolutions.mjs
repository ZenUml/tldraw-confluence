import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(repositoryRoot, 'tests/fixtures/wp1/npm-resolution-baseline.json');
const allowlistPath = path.join(repositoryRoot, 'docs/ops/wp1-package-resolution-allowlist.json');
const lockfilePath = path.join(repositoryRoot, 'pnpm-lock.yaml');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

for (const requiredPath of [baselinePath, allowlistPath, lockfilePath]) {
  if (!fs.existsSync(requiredPath)) {
    throw new Error(`Resolution guard input is missing: ${path.relative(repositoryRoot, requiredPath)}`);
  }
}

const baseline = readJson(baselinePath);
const allowlist = readJson(allowlistPath);
const pnpmLock = YAML.parse(fs.readFileSync(lockfilePath, 'utf8'));

if (baseline.schemaVersion !== 2 || allowlist.schemaVersion !== 3) {
  throw new Error('Unsupported WP1 resolution-guard schema version');
}
if (!pnpmLock.importers || !pnpmLock.packages || !pnpmLock.snapshots) {
  throw new Error('pnpm-lock.yaml is missing importers, packages, or snapshots');
}
for (const [importerName, graph] of Object.entries(baseline.importers ?? {})) {
  for (const edge of graph.edges ?? []) {
    if (edge.kind === 'peerDependency') {
      if (typeof edge.peerOptional !== 'boolean') {
        throw new Error(
          `${importerName}: baseline peer edge ${edge.fromName}@${edge.fromVersion}>${edge.dependencyName} is missing peerOptional`,
        );
      }
      if (typeof edge.requested !== 'string') {
        throw new Error(
          `${importerName}: baseline peer edge ${edge.fromName}@${edge.fromVersion}>${edge.dependencyName} is missing its requested range`,
        );
      }
    }
  }
}
const validMaterializedKinds = new Set(['dependency', 'optionalDependency']);
for (const [index, entry] of (allowlist.allowedTopologyResolutionChanges ?? []).entries()) {
  for (const field of ['baselineVersions', 'pnpmVersions', 'baselineKinds', 'pnpmKinds']) {
    if (!Array.isArray(entry[field])) {
      throw new Error(`Topology allowlist entry ${index} is missing ${field}`);
    }
  }
  if (entry.pnpmVersions.length === 0 || entry.pnpmKinds.length === 0) {
    throw new Error(`Topology allowlist entry ${index} has no pnpm target contract`);
  }
  for (const kind of [...entry.baselineKinds, ...entry.pnpmKinds]) {
    if (!validMaterializedKinds.has(kind)) {
      throw new Error(`Topology allowlist entry ${index} has unsupported kind ${kind}`);
    }
  }
}

const expectedPeerContract = allowlist.pnpmPeerDeclarationContract;
if (
  expectedPeerContract?.normalizationVersion !== 'json-array-v1'
  || !Number.isInteger(expectedPeerContract.count)
  || !/^[a-f0-9]{64}$/.test(expectedPeerContract.sha256 ?? '')
  || !expectedPeerContract.normalization
  || !expectedPeerContract.reason
) {
  throw new Error('The pnpm peer declaration contract is missing or invalid');
}

function pnpmPeerDeclarationContract(packages) {
  const rows = [];
  for (const packageKey of Object.keys(packages).sort()) {
    const packageRecord = packages[packageKey];
    const peerNames = new Set([
      ...Object.keys(packageRecord.peerDependencies ?? {}),
      ...Object.keys(packageRecord.peerDependenciesMeta ?? {}),
    ]);
    for (const peerName of [...peerNames].sort()) {
      rows.push([
        packageKey,
        peerName,
        packageRecord.peerDependencies?.[peerName] ?? null,
        packageRecord.peerDependenciesMeta?.[peerName]?.optional === true,
      ]);
    }
  }
  const canonicalJson = JSON.stringify(rows);
  return {
    count: rows.length,
    sha256: crypto.createHash('sha256').update(canonicalJson).digest('hex'),
  };
}

const actualPeerContract = pnpmPeerDeclarationContract(pnpmLock.packages);

const importerCategories = {
  '.': {
    dependencies: { category: 'runtime', kind: 'dependency' },
    optionalDependencies: { category: 'runtime', kind: 'optionalDependency' },
    devDependencies: { category: 'dev', kind: 'devDependency' },
  },
  'static/spa': {
    dependencies: { category: 'runtime', kind: 'dependency' },
    optionalDependencies: { category: 'runtime', kind: 'optionalDependency' },
    devDependencies: { category: 'build', kind: 'devDependency' },
  },
  'atlassian-migration': {
    dependencies: { category: 'runtime', kind: 'dependency' },
    optionalDependencies: { category: 'runtime', kind: 'optionalDependency' },
    devDependencies: { category: 'dev', kind: 'devDependency' },
  },
  'tests/e2e-tests': {
    dependencies: { category: 'runtime', kind: 'dependency' },
    optionalDependencies: { category: 'runtime', kind: 'optionalDependency' },
    devDependencies: { category: 'dev', kind: 'devDependency' },
  },
};

function referenceValue(reference) {
  return typeof reference === 'string' ? reference : reference?.version;
}

function splitAlias(reference, dependencyName) {
  const explicitAlias = reference.startsWith('npm:');
  const alias = explicitAlias ? reference.slice('npm:'.length) : reference;
  const peerContextIndex = alias.indexOf('(');
  const referenceHead = peerContextIndex === -1 ? alias : alias.slice(0, peerContextIndex);
  const separator = referenceHead.lastIndexOf('@');
  const implicitAlias = separator > 0;

  if (!explicitAlias && !implicitAlias) {
    return { packageName: dependencyName, packageReference: reference };
  }

  if (separator <= 0) {
    throw new Error(`Cannot parse pnpm npm alias ${reference}`);
  }
  return {
    packageName: alias.slice(0, separator),
    packageReference: alias.slice(separator + 1),
  };
}

function versionFromReference(dependencyName, rawReference) {
  const reference = referenceValue(rawReference);
  if (!reference || /^(?:link|workspace|file):/.test(reference)) return null;
  const { packageReference } = splitAlias(reference, dependencyName);
  return packageReference.split('(')[0];
}

function snapshotKeyFor(dependencyName, rawReference) {
  const reference = referenceValue(rawReference);
  if (!reference || /^(?:link|workspace|file):/.test(reference)) return null;
  const { packageName, packageReference } = splitAlias(reference, dependencyName);
  return `${packageName}@${packageReference}`;
}

function graphForImporter(importerName) {
  const importer = pnpmLock.importers[importerName];
  if (!importer) throw new Error(`pnpm-lock.yaml has no importer ${importerName}`);

  const categories = importerCategories[importerName];
  if (!categories) throw new Error(`No resolution category map exists for ${importerName}`);

  const directDependencies = { runtime: {}, build: {}, dev: {} };
  const roots = [];
  for (const [section, { category, kind }] of Object.entries(categories)) {
    for (const [name, record] of Object.entries(importer[section] ?? {})) {
      const resolvedVersion = versionFromReference(name, record);
      if (!resolvedVersion) {
        throw new Error(`${importerName}: unsupported direct ${section} reference for ${name}`);
      }
      directDependencies[category][name] = {
        kind,
        specifier: typeof record === 'string' ? record : record.specifier,
        resolvedVersion,
      };
      roots.push({ category, dependencyName: name, reference: referenceValue(record) });
    }
  }

  const nodesBySnapshot = new Map();
  const edgeReachability = new Map();

  for (const root of roots) {
    const rootKey = snapshotKeyFor(root.dependencyName, root.reference);
    if (!rootKey || !pnpmLock.snapshots[rootKey]) {
      throw new Error(`${importerName}: no pnpm snapshot for direct dependency ${root.dependencyName}@${root.reference}`);
    }

    const queue = [{ dependencyName: root.dependencyName, reference: root.reference }];
    const visited = new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      const snapshotKey = snapshotKeyFor(current.dependencyName, current.reference);
      if (!snapshotKey || visited.has(snapshotKey)) continue;
      visited.add(snapshotKey);

      const snapshot = pnpmLock.snapshots[snapshotKey];
      if (!snapshot) {
        throw new Error(`${importerName}: missing pnpm snapshot ${snapshotKey}`);
      }
      const { packageName, packageReference } = splitAlias(
        referenceValue(current.reference),
        current.dependencyName,
      );
      const packageVersion = packageReference.split('(')[0];
      const node = nodesBySnapshot.get(snapshotKey) ?? {
        categories: new Set(),
        name: packageName,
        version: packageVersion,
      };
      node.categories.add(root.category);
      nodesBySnapshot.set(snapshotKey, node);

      for (const [section, kind] of [
        ['dependencies', 'dependency'],
        ['optionalDependencies', 'optionalDependency'],
      ]) {
        for (const [dependencyName, reference] of Object.entries(snapshot[section] ?? {})) {
          const resolvedVersion = versionFromReference(dependencyName, reference);
          const targetKey = snapshotKeyFor(dependencyName, reference);
          if (!resolvedVersion || !targetKey || !pnpmLock.snapshots[targetKey]) {
            throw new Error(`${importerName}: ${snapshotKey} has an unresolved ${section} edge to ${dependencyName}@${reference}`);
          }

          const edgeId = `${snapshotKey}\u0000${kind}\u0000${dependencyName}\u0000${targetKey}`;
          const edgeCategories = edgeReachability.get(edgeId)?.categories ?? new Set();
          edgeCategories.add(root.category);
          edgeReachability.set(edgeId, {
            categories: edgeCategories,
            dependencyName,
            fromName: packageName,
            fromVersion: packageVersion,
            kind,
            toVersion: resolvedVersion,
          });
          queue.push({ dependencyName, reference });
        }
      }
    }
  }

  const peerDeclarations = [];
  for (const [snapshotKey, node] of nodesBySnapshot.entries()) {
    const packageKey = `${node.name}@${node.version}`;
    const packageRecord = pnpmLock.packages[packageKey];
    if (!packageRecord) {
      throw new Error(`${importerName}: ${snapshotKey} has no pnpm package metadata ${packageKey}`);
    }
    for (const [dependencyName, requested] of Object.entries(
      packageRecord.peerDependencies ?? {},
    )) {
      peerDeclarations.push({
        dependencyName,
        fromName: node.name,
        fromVersion: node.version,
        optional: packageRecord.peerDependenciesMeta?.[dependencyName]?.optional === true,
        reachability: [...node.categories].sort(),
        requested,
      });
    }
  }

  return {
    directDependencies,
    nodes: [...nodesBySnapshot.entries()].map(([id, node]) => ({
      id,
      name: node.name,
      version: node.version,
      reachability: [...node.categories].sort(),
    })),
    edges: [...edgeReachability.values()].map((edge) => ({
      ...edge,
      reachability: [...edge.categories].sort(),
      categories: undefined,
    })),
    peerDeclarations,
  };
}

function findDirectChange(importer, category, name, from, to) {
  return (allowlist.allowedDirectResolutionChanges ?? []).find((entry) =>
    entry.importer === importer
      && entry.category === category
      && entry.name === name
      && entry.from === from
      && entry.to === to
      && entry.reason,
  );
}

function findNewDevDependency(importer, name, version) {
  return (allowlist.allowedNewDevelopmentDependencies ?? []).find((entry) =>
    entry.importer === importer
      && entry.category === 'dev'
      && entry.name === name
      && entry.version === version
      && entry.reason,
  );
}

function edgeTargets(graph, category) {
  const result = new Map();
  for (const edge of graph.edges) {
    if (!edge.toVersion || !edge.reachability.includes(category)) continue;
    const key = `${edge.fromName}@${edge.fromVersion}>${edge.dependencyName}`;
    const targets = result.get(key) ?? new Set();
    targets.add(edge.toVersion);
    result.set(key, targets);
  }
  return result;
}

function edgeSemantics(graph, category) {
  const result = new Map();
  for (const edge of graph.edges) {
    if (!edge.reachability.includes(category)) continue;
    if (!['dependency', 'optionalDependency', 'peerDependency'].includes(edge.kind)) continue;
    const key = `${edge.fromName}@${edge.fromVersion}>${edge.dependencyName}`;
    const semantics = result.get(key) ?? {
      hasResolvedTarget: false,
      materializedKinds: new Set(),
      peerOptionalities: new Set(),
      peerRequests: new Set(),
    };
    if (edge.toVersion) semantics.hasResolvedTarget = true;
    if (edge.kind === 'peerDependency') {
      semantics.peerOptionalities.add(edge.peerOptional);
      semantics.peerRequests.add(edge.requested);
    } else if (edge.toVersion) {
      semantics.materializedKinds.add(edge.kind);
    }
    result.set(key, semantics);
  }
  for (const declaration of graph.peerDeclarations ?? []) {
    if (!declaration.reachability.includes(category)) continue;
    const key = `${declaration.fromName}@${declaration.fromVersion}>${declaration.dependencyName}`;
    const semantics = result.get(key) ?? {
      hasResolvedTarget: false,
      materializedKinds: new Set(),
      peerOptionalities: new Set(),
      peerRequests: new Set(),
    };
    semantics.peerOptionalities.add(declaration.optional);
    semantics.peerRequests.add(declaration.requested);
    result.set(key, semantics);
  }
  return result;
}

function effectiveMaterializedKinds(semantics) {
  if (semantics.materializedKinds.size > 0) return semantics.materializedKinds;
  return new Set(
    [...semantics.peerOptionalities].map((optional) =>
      optional ? 'optionalDependency' : 'dependency'),
  );
}

function setsEqual(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function describePeerOptionalities(optionalities) {
  return sorted(new Set(
    [...optionalities].map((optional) => optional ? 'optional' : 'required'),
  )).join(',') || '<none>';
}

function nodeVersions(graph, category) {
  return new Set(
    graph.nodes
      .filter((node) => node.reachability.includes(category))
      .map((node) => `${node.name}@${node.version}`),
  );
}

function sorted(set) {
  return [...set].sort();
}

function findEdgeChange(
  importer,
  category,
  key,
  baselineTargets,
  currentTargets,
  baselineKinds,
  currentKinds,
) {
  const separator = key.indexOf('>');
  const from = key.slice(0, separator);
  const dependencyName = key.slice(separator + 1);
  const atIndex = from.lastIndexOf('@');
  const fromName = from.slice(0, atIndex);
  const fromVersion = from.slice(atIndex + 1);
  return (allowlist.allowedTopologyResolutionChanges ?? []).find((entry) =>
    entry.importer === importer
      && entry.category === category
      && entry.fromName === fromName
      && entry.fromVersion === fromVersion
      && entry.dependencyName === dependencyName
      && JSON.stringify(entry.baselineVersions) === JSON.stringify(sorted(baselineTargets))
      && JSON.stringify(entry.pnpmVersions) === JSON.stringify(sorted(currentTargets))
      && JSON.stringify(entry.baselineKinds) === JSON.stringify(sorted(baselineKinds))
      && JSON.stringify(entry.pnpmKinds) === JSON.stringify(sorted(currentKinds))
      && entry.reason,
  );
}

const failures = [];
const allowedChanges = [];
const currentGraphs = {};

if (
  actualPeerContract.count !== expectedPeerContract.count
  || actualPeerContract.sha256 !== expectedPeerContract.sha256
) {
  failures.push(
    `pnpm peer declaration contract changed count ${expectedPeerContract.count} -> ${actualPeerContract.count}, sha256 ${expectedPeerContract.sha256} -> ${actualPeerContract.sha256}`,
  );
}

for (const importerName of Object.keys(importerCategories)) {
  currentGraphs[importerName] = graphForImporter(importerName);
}

for (const [importerName, currentGraph] of Object.entries(currentGraphs)) {
  const baselineGraph = baseline.importers[importerName] ?? {
    directDependencies: { runtime: {}, build: {}, dev: {} },
    nodes: [],
    edges: [],
  };

  for (const category of ['runtime', 'build', 'dev']) {
    const expectedDirect = baselineGraph.directDependencies[category] ?? {};
    const actualDirect = currentGraph.directDependencies[category] ?? {};
    for (const [name, directDependency] of Object.entries(actualDirect)) {
      if (directDependency.specifier !== directDependency.resolvedVersion) {
        failures.push(
          `${importerName}: direct ${category} dependency ${name} must be pinned exactly to ${directDependency.resolvedVersion}; got ${directDependency.specifier ?? '<missing>'}`,
        );
      }
    }
    for (const name of new Set([...Object.keys(expectedDirect), ...Object.keys(actualDirect)])) {
      const expectedRecord = expectedDirect[name];
      const actualRecord = actualDirect[name];
      const expected = expectedRecord?.resolvedVersion ?? null;
      const actual = actualRecord?.resolvedVersion ?? null;
      if (expectedRecord && actualRecord) {
        // The immutable npm baseline was captured only from dependencies and
        // devDependencies; all three source locks had zero direct optionalDependencies.
        const expectedKind = expectedRecord.kind
          ?? (category === 'runtime' ? 'dependency' : 'devDependency');
        if (expectedKind !== actualRecord.kind) {
          failures.push(
            `${importerName}: direct ${category} dependency ${name} kind changed ${expectedKind} -> ${actualRecord.kind}`,
          );
        }
      }
      if (expected === actual) continue;

      const allowedDirectChange = findDirectChange(importerName, category, name, expected, actual);
      if (allowedDirectChange) {
        allowedChanges.push(`${importerName}:${category}:${name} ${expected} -> ${actual}`);
        continue;
      }
      const allowedNewDev = expected === null
        && category === 'dev'
        && findNewDevDependency(importerName, name, actual);
      if (allowedNewDev) {
        allowedChanges.push(`${importerName}:${category}:${name} added at ${actual}`);
        continue;
      }
      failures.push(`${importerName}: direct ${category} dependency ${name} changed ${expected ?? '<missing>'} -> ${actual ?? '<missing>'}`);
    }
  }

  for (const category of ['runtime', 'build']) {
    const expectedSemantics = edgeSemantics(baselineGraph, category);
    const actualSemantics = edgeSemantics(currentGraph, category);
    const expectedEdges = edgeTargets(baselineGraph, category);
    const actualEdges = edgeTargets(currentGraph, category);
    const allowedTopologyKeys = new Set();
    for (const key of new Set([...expectedEdges.keys(), ...actualEdges.keys()])) {
      const expected = expectedEdges.get(key) ?? new Set();
      const actual = actualEdges.get(key) ?? new Set();
      if (JSON.stringify(sorted(expected)) === JSON.stringify(sorted(actual))) continue;
      const expectedKinds = expectedSemantics.get(key)?.materializedKinds ?? new Set();
      const actualKinds = actualSemantics.get(key)?.materializedKinds ?? new Set();
      const allowed = findEdgeChange(
        importerName,
        category,
        key,
        expected,
        actual,
        expectedKinds,
        actualKinds,
      );
      if (allowed) {
        allowedChanges.push(`${importerName}:${category}:${key} ${sorted(expected).join(',')} -> ${sorted(actual).join(',')}`);
        allowedTopologyKeys.add(key);
      } else {
        failures.push(
          `${importerName}: ${category} edge ${key} changed versions [${sorted(expected).join(', ')}] -> [${sorted(actual).join(', ')}], kinds [${sorted(expectedKinds).join(', ')}] -> [${sorted(actualKinds).join(', ')}]`,
        );
      }
    }

    for (const key of new Set([...expectedSemantics.keys(), ...actualSemantics.keys()])) {
      const expectedForEdge = expectedSemantics.get(key) ?? {
        hasResolvedTarget: false,
        materializedKinds: new Set(),
        peerOptionalities: new Set(),
        peerRequests: new Set(),
      };
      const actualForEdge = actualSemantics.get(key) ?? {
        hasResolvedTarget: false,
        materializedKinds: new Set(),
        peerOptionalities: new Set(),
        peerRequests: new Set(),
      };
      if (expectedForEdge.peerOptionalities.size > 0) {
        if (!setsEqual(expectedForEdge.peerOptionalities, actualForEdge.peerOptionalities)) {
          failures.push(
            `${importerName}: ${category} edge ${key} peer optionality changed ${describePeerOptionalities(expectedForEdge.peerOptionalities)} -> ${describePeerOptionalities(actualForEdge.peerOptionalities)}`,
          );
        }
        if (!setsEqual(expectedForEdge.peerRequests, actualForEdge.peerRequests)) {
          failures.push(
            `${importerName}: ${category} edge ${key} peer request changed [${sorted(expectedForEdge.peerRequests).join(', ')}] -> [${sorted(actualForEdge.peerRequests).join(', ')}]`,
          );
        }
      }
      if (!expectedForEdge.hasResolvedTarget && !actualForEdge.hasResolvedTarget) continue;
      if (allowedTopologyKeys.has(key)) continue;

      const expected = effectiveMaterializedKinds(expectedForEdge);
      const actual = effectiveMaterializedKinds(actualForEdge);
      if (setsEqual(expected, actual)) continue;
      const pnpmEncodedDualDeclarationAsOptionalPeer =
        expectedForEdge.materializedKinds.size === 1
        && expectedForEdge.materializedKinds.has('dependency')
        && expectedForEdge.peerOptionalities.size === 1
        && expectedForEdge.peerOptionalities.has(true)
        && actualForEdge.materializedKinds.size === 1
        && actualForEdge.materializedKinds.has('optionalDependency');
      if (pnpmEncodedDualDeclarationAsOptionalPeer) continue;
      failures.push(
        `${importerName}: ${category} edge ${key} dependency kind changed ${sorted(expected).join(',')} -> ${sorted(actual).join(',')}`,
      );
    }

    const expectedNodes = nodeVersions(baselineGraph, category);
    const actualNodes = nodeVersions(currentGraph, category);
    for (const missing of [...expectedNodes].filter((entry) => !actualNodes.has(entry))) {
      const representedByAllowedEdge = (allowlist.allowedTopologyResolutionChanges ?? []).some((entry) =>
        entry.importer === importerName
          && entry.category === category
          && entry.baselineVersions.some((version) => missing === `${entry.dependencyName}@${version}`),
      );
      if (!representedByAllowedEdge) failures.push(`${importerName}: ${category} package disappeared: ${missing}`);
    }
    for (const added of [...actualNodes].filter((entry) => !expectedNodes.has(entry))) {
      const representedByAllowedEdge = (allowlist.allowedTopologyResolutionChanges ?? []).some((entry) =>
        entry.importer === importerName
          && entry.category === category
          && entry.pnpmVersions.some((version) => added === `${entry.dependencyName}@${version}`),
      );
      if (!representedByAllowedEdge) failures.push(`${importerName}: new ${category} package appeared: ${added}`);
    }
  }
}

const reviewedAllowlistCount =
  (allowlist.allowedDirectResolutionChanges ?? []).length
  + (allowlist.allowedNewDevelopmentDependencies ?? []).length
  + (allowlist.allowedTopologyResolutionChanges ?? []).length;
if (allowedChanges.length !== reviewedAllowlistCount) {
  failures.push(
    `reviewed allowlist consumption changed expected ${reviewedAllowlistCount} -> applied ${allowedChanges.length}`,
  );
}

if (failures.length > 0) {
  console.error(`Package-manager resolution guard failed with ${failures.length} difference(s):`);
  for (const failure of failures.slice(0, 200)) console.error(`- ${failure}`);
  if (failures.length > 200) console.error(`- ... ${failures.length - 200} more`);
  process.exitCode = 1;
} else {
  console.log('Package-manager resolution guard passed.');
}

for (const importerName of Object.keys(importerCategories)) {
  const baselineGraph = baseline.importers[importerName] ?? { nodes: [], edges: [] };
  const currentGraph = currentGraphs[importerName];
  const summary = ['runtime', 'build', 'dev'].map((category) => {
    const beforeNodes = nodeVersions(baselineGraph, category).size;
    const afterNodes = nodeVersions(currentGraph, category).size;
    const beforeEdges = edgeTargets(baselineGraph, category).size;
    const afterEdges = edgeTargets(currentGraph, category).size;
    return `${category} nodes ${beforeNodes}->${afterNodes}, edges ${beforeEdges}->${afterEdges}`;
  });
  console.log(`${importerName}: ${summary.join('; ')}`);
}
console.log(`Reviewed allowlisted changes applied: ${allowedChanges.length}`);
for (const change of allowedChanges) console.log(`- ${change}`);
