import { asNullableNumber } from './as-nullable-number.js'
import { asNullableString } from './as-nullable-string.js'
import { asPreferredFlag } from './as-preferred-flag.js'

/**
 * @param {Record<string, unknown>} row
 */
export const toActivity = (row) => {
  return {
    type: 'activities',
    id: asNullableString(row.wsa_id),
    activityName: asNullableString(row.activity_name),
    status: asNullableString(row.activity_status),
    sequenceNumber: asNullableNumber(row.activitysequencenumber),
    performActivity: asPreferredFlag(row.activityrequiredflag),
    workbasket: asNullableString(row.workbasketname),
    assignedTo: asNullableString(row.assigned_to),
    externalReference: asNullableString(row.external_reference),
    supplierIdentifier: asNullableString(row.supplier_identifier),
    deliveryPartnerIdentifier: asNullableString(row.delivery_partner_identifier)
  }
}
