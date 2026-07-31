export const ARCHIVE_SCHEMA_VERSION = '2.0.0';
export const SUPPORTED_ARCHIVE_SCHEMA_VERSIONS = new Set(['1.0.0', ARCHIVE_SCHEMA_VERSION]);

export function archiveSchemaVersionError(value) {
  if (value === undefined) return ['archive_schema_version.required', `Archive must declare an archive_schema_version; unversioned archives are unsupported.`];
  if (typeof value !== 'string') return ['archive_schema_version.type', 'archive_schema_version must be a semantic-version string.'];
  if (value !== value.trim() || !/^\d+\.\d+\.\d+$/.test(value)) return ['archive_schema_version.format', 'archive_schema_version must be an unpadded semantic version such as 1.0.0.'];
  const [major] = value.split('.').map(Number);
  if (major < 1) return ['archive_schema_version.unsupported', `Archive version ${value} is unsupported; unversioned and pre-remediation archives are not accepted.`];
  if (major > 2) return ['archive_schema_version.major', `Archive major version ${major} is not understood; this validator supports 1.0.0 and ${ARCHIVE_SCHEMA_VERSION}.`];
  if (!SUPPORTED_ARCHIVE_SCHEMA_VERSIONS.has(value)) return ['archive_schema_version.unsupported', `Archive version ${value} is unsupported; this validator accepts 1.0.0 and ${ARCHIVE_SCHEMA_VERSION}.`];
  return null;
}

export function assertLearningEvidenceArchive(manifest) {
  if (manifest?.archive_schema_version !== ARCHIVE_SCHEMA_VERSION) {
    throw new Error(`Learning evidence requires archive_schema_version ${ARCHIVE_SCHEMA_VERSION}; version 1.0.0 archives remain read-only-valid.`);
  }
}
