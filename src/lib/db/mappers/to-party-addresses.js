import { toAddress } from './to-address.js'

/**
 * Returns each address once. An address linked twice is preferred if either
 * link is.
 *
 * @param {Record<string, unknown>[]} rows find-party-addresses.sql rows
 * @returns {ReturnType<typeof toAddress>[]}
 */
export const toPartyAddresses = (rows) => {
  /** @type {Map<unknown, ReturnType<typeof toAddress>>} */
  const addressesByKey = new Map()

  for (const row of rows) {
    const address = toAddress(row)
    const listedAddress = addressesByKey.get(row.address_pk)

    if (listedAddress) {
      if (address.isPreferred) {
        listedAddress.isPreferred = true
      }

      continue
    }

    addressesByKey.set(row.address_pk, address)
  }

  return Array.from(addressesByKey.values())
}
