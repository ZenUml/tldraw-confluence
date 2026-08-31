import path from 'node:path';
import { validate } from '@forge/manifest';

const manifestPath = path.resolve(process.argv[2] ?? 'manifest.yml');

const formatDiagnostic = ({ column, level, line, message, reference }) => {
  const location = line === undefined
    ? manifestPath
    : `${manifestPath}:${line}${column === undefined ? '' : `:${column}`}`;
  const rule = reference ? ` (${reference})` : '';

  return `[${level}] ${location}${rule}: ${message}`;
};

try {
  const result = await validate(false, manifestPath);
  const diagnostics = result.errors ?? [];
  const errors = diagnostics.filter(({ level }) => level === 'error');
  const warnings = diagnostics.filter(({ level }) => level === 'warning');

  for (const diagnostic of diagnostics) {
    const output = formatDiagnostic(diagnostic);
    if (diagnostic.level === 'error') {
      console.error(output);
    } else {
      console.warn(output);
    }
  }

  console.log(
    `Forge manifest validation: ${errors.length} error(s), ${warnings.length} warning(s)`,
  );
  process.exitCode = errors.length === 0 ? 0 : 1;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Forge manifest validation failed: ${message}`);
  process.exitCode = 1;
}
