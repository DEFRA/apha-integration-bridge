/**
 * @param {Record<string, unknown>} row
 */
const fromTime = (row) =>
  row.feature_involv_from_date instanceof Date
    ? row.feature_involv_from_date.getTime()
    : Number.NEGATIVE_INFINITY

/**
 * Sorts the holdership rows of a CPH (find-holdings.sql) so that the selected
 * holdership comes first: the latest from date, then the highest SAM key.
 * `POST /holdings/find` reports the selected holdership and the holding
 * sub-resources mark it.
 *
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @returns {number}
 */
export const bySelectedHoldership = (a, b) =>
  fromTime(b) - fromTime(a) ||
  Number(b.feature_involvement_pk ?? 0) - Number(a.feature_involvement_pk ?? 0)
