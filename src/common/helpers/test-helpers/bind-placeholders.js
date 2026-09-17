/**
 * The names of the :bind placeholders in a piece of Oracle SQL, sorted, so a
 * test can compare them with the keys of the bindings object. Oracle rejects
 * a bind object whose keys do not match the placeholders exactly.
 *
 * Comments go first: an apostrophe in a comment would otherwise pair up with
 * the next quote and hide real placeholders. Then quoted literals go (allowing
 * for '' escapes), so the hh24:mi:ss in a format mask is not mistaken for a
 * bind.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export const placeholdersIn = (sql) => {
  const withoutComments = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')

  const withoutLiterals = withoutComments.replace(/'(?:[^']|'')*'/g, '')

  const names = withoutLiterals.match(/:[a-z_]\w*/gi) ?? []

  return [...new Set(names.map((name) => name.slice(1)))].sort()
}
