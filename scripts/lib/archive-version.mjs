export const ARCHIVE_SCHEMA_VERSION = '1.0.0';

export function archiveSchemaVersionError(value) {
  if (value === undefined) return ['archive_schema_version.required', `Archive must declare archive_schema_version ${ARCHIVE_SCHEMA_VERSION}; unversioned archives are unsupported.`];
  if (typeof value !== 'string') return ['archive_schema_version.type', 'archive_schema_version must be a semantic-version string.'];
  if (value !== value.trim() || !/^\d+\.\d+\.\d+$/.test(value)) return ['archive_schema_version.format', 'archive_schema_version must be an unpadded semantic version such as 1.0.0.'];
  const [major] = value.split('.').map(Number);
  if (major < 1) return ['archive_schema_version.unsupported', `Archive version ${value} is unsupported; unversioned and pre-remediation archives are not accepted.`];
  if (major > 1) return ['archive_schema_version.major', `Archive major version ${major} is not understood; this validator supports ${ARCHIVE_SCHEMA_VERSION}.`];
  if (value !== ARCHIVE_SCHEMA_VERSION) return ['archive_schema_version.unsupported', `Archive version ${value} is unsupported; this validator accepts exactly ${ARCHIVE_SCHEMA_VERSION}.`];
  return null;
}
