// Escapes regex metacharacters so user-supplied search text is matched
// literally instead of being interpreted as a pattern (prevents both
// regex-injection - e.g. searching ".*" to bypass an intended filter - and
// ReDoS via pathological patterns).
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
