import { asNullableNumber } from './as-nullable-number.js'
import { asNullableString } from './as-nullable-string.js'

/**
 * @param {Record<string, unknown>} row
 */
export const toActivity = (row) => {
  return {
    type: 'activities',
    id: asNullableString(row.wsa_id),
    activityName: asNullableString(row.activity_name),
    sequenceNumber: asNullableNumber(row.activitysequencenumber)
  }
}
