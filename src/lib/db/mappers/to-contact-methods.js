import { mask } from '../../pii/index.js'
import { asNullableString } from './as-nullable-string.js'
import { asPreferredFlag } from './as-preferred-flag.js'

/**
 * Maps SAM telecom types to the API type and the key that holds the value.
 *
 * @type {Record<string, { type: string, valueKey: string }>}
 */
const CONTACT_METHOD_TYPES = {
  EMAIL: { type: 'email', valueKey: 'emailAddress' },
  MOBILE: { type: 'mobile', valueKey: 'phoneNumber' },
  LANDLINE: { type: 'landline', valueKey: 'phoneNumber' },
  FAX: { type: 'fax', valueKey: 'faxNumber' }
}

/**
 * @typedef {{
 *   type: string,
 *   emailAddress?: string | null,
 *   phoneNumber?: string | null,
 *   faxNumber?: string | null,
 *   isPreferred: boolean,
 *   usageType: string | null
 * }} ContactMethod
 */

/**
 * Maps a party's contact rows to email, phone and fax entries, one per value
 * and usage type. Duplicates are removed before masking so that two numbers
 * that mask the same are both kept.
 *
 * @param {Record<string, unknown>[]} rows find-party-contacts.sql rows
 * @returns {ContactMethod[]}
 */
export const toContactMethods = (rows) => {
  /** @type {Map<string, ContactMethod>} */
  const contactMethodsByKey = new Map()

  for (const row of rows) {
    const contactMethodType =
      CONTACT_METHOD_TYPES[String(row.telecom_address_type)]

    if (!contactMethodType) {
      continue
    }

    const value = asNullableString(row.contact_value)

    if (!value) {
      continue
    }

    const usageType = asNullableString(row.address_usage_type)
    const isPreferred = asPreferredFlag(row.preferred_contact_method_ind)
    const key = `${contactMethodType.type}:${value}:${usageType}`
    const listedContactMethod = contactMethodsByKey.get(key)

    if (listedContactMethod) {
      if (isPreferred) {
        listedContactMethod.isPreferred = true
      }

      continue
    }

    contactMethodsByKey.set(key, {
      type: contactMethodType.type,
      [contactMethodType.valueKey]: mask(value),
      isPreferred,
      usageType
    })
  }

  return Array.from(contactMethodsByKey.values())
}
