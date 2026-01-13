class MappingError extends Error {}

// DEFRA Identity / Dynamics title option codes.
const TITLE_MAP = {
  1: 'Mr',
  2: 'Mrs',
  3: 'Ms',
  4: 'Miss',
  5: 'Dr',
  6: 'Prof'
}

// Include a field on the target if the source says it has a value and the transformed value is defined.
function includeMappedField(
  target,
  source,
  sourceField,
  targetField,
  options = {}
) {
  const { transform, allowMissingFlag = false } = options

  const flag = hasValue(source, sourceField)

  if (flag === false) {
    return
  }

  let value = source?.[sourceField]

  if (transform) {
    value = transform(value, source)
  }

  if (value === undefined) {
    return
  }

  if (flag === null) {
    if (!allowMissingFlag) {
      return
    }

    if (value === null) {
      return
    }
  }

  target[targetField] = value
}

// Apply a list of mapping instructions to a target object.
function applyFieldMappings(target, source, mappings = []) {
  if (!source || !Array.isArray(mappings) || mappings.length === 0) {
    return
  }

  for (const mapping of mappings) {
    if (!mapping?.source || !mapping?.target) {
      continue
    }

    includeMappedField(target, source, mapping.source, mapping.target, {
      transform: mapping.transform,
      allowMissingFlag: mapping.allowMissingFlag
    })
  }
}

// Return a value only when the accompanying *_hasvalue flag allows it.
function valueWithFlag(source, field, options = {}) {
  const { allowMissingFlag = false, transform } = options

  const flag = hasValue(source, field)

  if (flag === false) {
    return undefined
  }

  let value = source?.[field]

  if (transform) {
    value = transform(value, source)
  }

  if (value === undefined) {
    return undefined
  }

  if (flag === null && !allowMissingFlag) {
    return undefined
  }

  if (flag === null && value === null) {
    return undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed === '') {
      return undefined
    }

    return trimmed
  }

  return value
}

// Decode a *_hasvalue flag into true/false/null (missing).
function hasValue(source, field) {
  const flag = source?.[`${field}_hasvalue`]

  if (flag === undefined || flag === null) {
    return null
  }

  if (typeof flag === 'string') {
    if (flag.toLowerCase() === 'true') {
      return true
    }

    if (flag.toLowerCase() === 'false') {
      return false
    }
  }

  return Boolean(flag)
}

// Build a multi-line street string from address parts.
function buildStreet(parts) {
  const filtered = parts.filter((part) => part !== undefined && part !== null)

  if (filtered.length === 0) {
    return undefined
  }

  return filtered.join('\n')
}

// Trim strings and collapse empty strings to undefined.
function normaliseString(value) {
  if (value === null) {
    return null
  }

  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return undefined
  }

  return trimmed
}

// Map numeric title code to display value.
function mapTitle(value) {
  if (value === null) {
    return null
  }

  const mapped = TITLE_MAP[String(value)]

  return mapped || undefined
}

// Parse dates and return YYYY-MM-DD or undefined when invalid.
function normaliseDate(value) {
  if (value === null) {
    return null
  }

  if (!value) {
    return undefined
  }

  const parsed = toDate(value)

  if (!parsed) {
    return undefined
  }

  return parsed.toISOString().slice(0, 10)
}

// Safe Date constructor wrapper that returns null on invalid input.
function toDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

// Convert a truthy-ish value to boolean, preserving null and undefined.
function toBoolean(value) {
  if (value === null) {
    return null
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true
    }

    if (value.toLowerCase() === 'false') {
      return false
    }
  }

  if (value === undefined) {
    return undefined
  }

  return Boolean(value)
}

export {
  MappingError,
  applyFieldMappings,
  includeMappedField,
  valueWithFlag,
  hasValue,
  buildStreet,
  normaliseString,
  mapTitle,
  normaliseDate,
  toDate,
  toBoolean
}
