import { toOrganisation } from './to-organisation.js'

/**
 * @param {{ fullName: string | null, emailAddress: string | null, phoneNumber: string | null }} target
 * @param {{ fullName: string | null, emailAddress: string | null, phoneNumber: string | null }} source
 */
const mergeContactDetails = (target, source) => {
  if (target.fullName === null && source.fullName !== null) {
    target.fullName = source.fullName
  }

  if (target.emailAddress === null && source.emailAddress !== null) {
    target.emailAddress = source.emailAddress
  }

  if (target.phoneNumber === null && source.phoneNumber !== null) {
    target.phoneNumber = source.phoneNumber
  }
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toOrganisations = (rows, ids) => {
  const organisations = new Map()
  const plantKeys = new Map()

  for (const row of rows) {
    const mapped = toOrganisation(row)

    if (!mapped) {
      continue
    }

    if (!organisations.has(mapped.id)) {
      organisations.set(mapped.id, mapped)
      plantKeys.set(
        mapped.id,
        new Set(
          mapped.relationships.srabpiPlants.data.map(
            (relationship) => relationship.id
          )
        )
      )
      continue
    }

    const organisation = organisations.get(mapped.id)

    if (!organisation) {
      continue
    }

    if (!organisation.address && mapped.address) {
      organisation.address = mapped.address
    }

    mergeContactDetails(
      organisation.contactDetails.primaryContact,
      mapped.contactDetails.primaryContact
    )
    mergeContactDetails(
      organisation.contactDetails.secondaryContact,
      mapped.contactDetails.secondaryContact
    )

    for (const relationship of mapped.relationships.srabpiPlants.data) {
      if (!plantKeys.get(mapped.id)?.has(relationship.id)) {
        organisation.relationships.srabpiPlants.data.push(relationship)
        plantKeys.get(mapped.id)?.add(relationship.id)
      }
    }
  }

  return ids
    .map((id) => organisations.get(id))
    .filter((organisation) => organisation !== undefined)
}
