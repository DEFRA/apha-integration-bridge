import { toPerson } from './to-person.js'

/**
 * @param {{ type: 'email', emailAddress: string } | { type: 'mobile' | 'landline', phoneNumber: string }} detail
 */
const contactDetailKey = (detail) => {
  if (detail.type === 'email') {
    return `${detail.type}:${detail.emailAddress}`
  }

  return `${detail.type}:${detail.phoneNumber}`
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toPeople = (rows, ids) => {
  const people = new Map()
  const addressKeys = new Map()
  const contactKeys = new Map()
  const plantKeys = new Map()

  for (const row of rows) {
    const mapped = toPerson(row)

    if (!mapped) {
      continue
    }

    if (!people.has(mapped.id)) {
      people.set(mapped.id, mapped)
      addressKeys.set(
        mapped.id,
        new Set(mapped.addresses.map((address) => JSON.stringify(address)))
      )
      contactKeys.set(
        mapped.id,
        new Set(mapped.contactDetails.map((detail) => contactDetailKey(detail)))
      )
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

    const person = people.get(mapped.id)

    if (!person) {
      continue
    }

    for (const address of mapped.addresses) {
      const key = JSON.stringify(address)

      if (!addressKeys.get(mapped.id)?.has(key)) {
        person.addresses.push(address)
        addressKeys.get(mapped.id)?.add(key)
      }
    }

    for (const detail of mapped.contactDetails) {
      const key = contactDetailKey(detail)

      if (!contactKeys.get(mapped.id)?.has(key)) {
        person.contactDetails.push(detail)
        contactKeys.get(mapped.id)?.add(key)
      }
    }

    for (const relationship of mapped.relationships.srabpiPlants.data) {
      if (!plantKeys.get(mapped.id)?.has(relationship.id)) {
        person.relationships.srabpiPlants.data.push(relationship)
        plantKeys.get(mapped.id)?.add(relationship.id)
      }
    }
  }

  return ids
    .map((id) => people.get(id))
    .filter((person) => person !== undefined)
}
