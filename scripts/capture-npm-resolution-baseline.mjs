import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
  repositoryRoot,
  'tests/fixtures/wp1/npm-resolution-baseline.json',
);

const importerDefinitions = [
  {
    importer: '.',
    lockfile: 'package-lock.json',
    categories: { dependencies: 'runtime', devDependencies: 'dev' },
  },
  {
    importer: 'static/spa',
    lockfile: 'static/spa/package-lock.json',
    categories: { dependencies: 'runtime', devDependencies: 'build' },
  },
  {
    importer: 'atlassian-migration',
    lockfile: 'atlassian-migration/package-lock.json',
    categories: { dependencies: 'runtime', devDependencies: 'dev' },
  },
];

const edgeSections = [
  ['dependencies', 'dependency'],
  ['optionalDependencies', 'optionalDependency'],
  ['peerDependencies', 'peerDependency'],
];

function packageNameFromPath(packagePath) {
  const marker = 'node_modules/';
  const markerIndex = packagePath.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Cannot infer a package name from ${packagePath}`);
  }

  const suffix = packagePath.slice(markerIndex + marker.length);
  const segments = suffix.split('/');
  return suffix.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

function resolveNpmPackagePath(packages, fromPackagePath, dependencyName) {
  let searchRoot = fromPackagePath;

  while (true) {
    const candidate = searchRoot
      ? `${searchRoot}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (packages[candidate]?.version) {
      return candidate;
    }

    const nestedNodeModules = searchRoot.lastIndexOf('/node_modules/');
    if (nestedNodeModules !== -1) {
      searchRoot = searchRoot.slice(0, nestedNodeModules);
      continue;
    }
    if (searchRoot.startsWith('node_modules/')) {
      searchRoot = '';
      continue;
    }
    return null;
  }
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function captureImporter(definition) {
  const absoluteLockfile = path.join(repositoryRoot, definition.lockfile);
  if (!fs.existsSync(absoluteLockfile)) {
    throw new Error(`Required npm resolution source is missing: ${definition.lockfile}`);
  }

  const lock = JSON.parse(fs.readFileSync(absoluteLockfile, 'utf8'));
  if (!lock.packages?.['']) {
    throw new Error(`${definition.lockfile} does not contain a packages[""] importer`);
  }

  const packages = lock.packages;
  const rootPackage = packages[''];
  const directDependencies = { runtime: {}, build: {}, dev: {} };
  const roots = [];

  for (const [section, category] of Object.entries(definition.categories)) {
    for (const [name, specifier] of Object.entries(rootPackage[section] ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
      const resolvedPath = resolveNpmPackagePath(packages, '', name);
      if (!resolvedPath) {
        throw new Error(`${definition.lockfile}: cannot resolve direct ${section} entry ${name}`);
      }
      const resolvedVersion = packages[resolvedPath].version;
      directDependencies[category][name] = { specifier, resolvedVersion };
      roots.push({ category, packagePath: resolvedPath });
    }
  }

  const allEdgesBySource = new Map();
  for (const [packagePath, packageRecord] of Object.entries(packages)) {
    if (!packagePath || !packageRecord.version) continue;

    const edges = [];
    for (const [section, kind] of edgeSections) {
      for (const [dependencyName, requested] of Object.entries(packageRecord[section] ?? {})) {
        const resolvedPath = resolveNpmPackagePath(packages, packagePath, dependencyName);
        const resolvedRecord = resolvedPath ? packages[resolvedPath] : null;
        edges.push({
          dependencyName,
          kind,
          requested,
          resolvedPath,
          resolvedVersion: resolvedRecord?.version ?? null,
        });
      }
    }
    edges.sort((left, right) =>
      `${left.kind}:${left.dependencyName}`.localeCompare(`${right.kind}:${right.dependencyName}`),
    );
    allEdgesBySource.set(packagePath, edges);
  }

  const nodeReachability = new Map();
  const edgeReachability = new Map();
  for (const root of roots) {
    const queue = [root.packagePath];
    const visited = new Set();

    while (queue.length > 0) {
      const packagePath = queue.shift();
      if (visited.has(packagePath)) continue;
      visited.add(packagePath);

      const categories = nodeReachability.get(packagePath) ?? new Set();
      categories.add(root.category);
      nodeReachability.set(packagePath, categories);

      for (const edge of allEdgesBySource.get(packagePath) ?? []) {
        const edgeId = `${packagePath}\u0000${edge.kind}\u0000${edge.dependencyName}\u0000${edge.resolvedPath ?? ''}`;
        const edgeCategories = edgeReachability.get(edgeId)?.categories ?? new Set();
        edgeCategories.add(root.category);
        edgeReachability.set(edgeId, {
          categories: edgeCategories,
          edge,
          fromPath: packagePath,
        });
        if (edge.resolvedPath) queue.push(edge.resolvedPath);
      }
    }
  }

  const nodes = [...nodeReachability.entries()]
    .map(([packagePath, categories]) => ({
      id: packagePath,
      name: packages[packagePath].name ?? packageNameFromPath(packagePath),
      version: packages[packagePath].version,
      reachability: [...categories].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const edges = [...edgeReachability.values()]
    .map(({ categories, edge, fromPath }) => ({
      from: fromPath,
      fromName: packages[fromPath].name ?? packageNameFromPath(fromPath),
      fromVersion: packages[fromPath].version,
      dependencyName: edge.dependencyName,
      kind: edge.kind,
      requested: edge.requested,
      to: edge.resolvedPath,
      toVersion: edge.resolvedVersion,
      ...(edge.kind === 'peerDependency'
        ? {
            peerOptional:
              packages[fromPath].peerDependenciesMeta?.[edge.dependencyName]?.optional === true,
          }
        : {}),
      reachability: [...categories].sort(),
    }))
    .sort((left, right) =>
      `${left.from}\u0000${left.kind}\u0000${left.dependencyName}\u0000${left.to ?? ''}`.localeCompare(
        `${right.from}\u0000${right.kind}\u0000${right.dependencyName}\u0000${right.to ?? ''}`,
      ),
    );

  return {
    sourceLockfile: definition.lockfile,
    sourceLockfileVersion: lock.lockfileVersion,
    directDependencies: {
      runtime: sortObject(directDependencies.runtime),
      build: sortObject(directDependencies.build),
      dev: sortObject(directDependencies.dev),
    },
    nodes,
    edges,
  };
}

const baseline = {
  schemaVersion: 2,
  description: 'Immutable npm resolution graph and peer optionality captured before the WP1 pnpm conversion.',
  importers: Object.fromEntries(
    importerDefinitions.map((definition) => [definition.importer, captureImporter(definition)]),
  ),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);

const totals = Object.entries(baseline.importers).map(([importer, graph]) => ({
  importer,
  nodes: graph.nodes.length,
  edges: graph.edges.length,
}));
console.log(`Wrote ${path.relative(repositoryRoot, outputPath)}`);
for (const total of totals) {
  console.log(`${total.importer}: ${total.nodes} reachable packages, ${total.edges} dependency edges`);
}
