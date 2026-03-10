/**
 * Danger-command detection.
 * Returns true if a command matches known destructive patterns.
 */

const DANGER_PATTERNS = [
  // Filesystem — rm with recursive flag (any case, combined or separate flags)
  /\brm\s+.*-[a-zA-Z]*[rR][a-zA-Z]*/,
  /\bmkfs\b/,
  /\bdd\b.+\bof=/,
  /\bshred\b/,
  /\btruncate\b/,

  // Docker
  /\bdocker\s+(system\s+prune|container\s+prune|volume\s+prune|image\s+prune|network\s+prune)/,
  /\bdocker\s+rm\b/,
  /\bdocker\s+rmi\b/,

  // Kubernetes
  /\bkubectl\s+delete\b/,
  /\bkubectl\s+drain\b/,
  /\bkubectl\s+cordon\b/,

  // Terraform
  /\bterraform\s+destroy\b/,
  /\bterraform\s+apply\b/,

  // Databases
  /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,

  // Git
  /\bgit\s+(push\s+.*--force|push\s+-f\b)/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-[a-z]*f/,

  // Process / system
  /\bkillall\b/,
  /\bpkill\b/,
  /\bsystemctl\s+(stop|disable|mask)\b/,
];

/**
 * Returns true if the command is considered dangerous.
 * @param {string} command
 * @returns {boolean}
 */
export function isDangerous(command) {
  return DANGER_PATTERNS.some(p => p.test(command));
}
