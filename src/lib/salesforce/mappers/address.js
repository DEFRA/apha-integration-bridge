import { createRequire } from 'node:module'

import countries from 'i18n-iso-countries'

import {
  buildStreet,
  normaliseString,
  toBoolean,
  toDate,
  valueWithFlag
} from './shared.js'

const nodeRequire = createRequire(import.meta.url)
const en = nodeRequire('i18n-iso-countries/langs/en.json')

countries.registerLocale(en)

// Resolve a country code/label from a provided country id or name.
function resolveCountry(value) {
  const normalised = normaliseString(value)

  if (!normalised) {
    return {}
  }

  const upper = normalised.toUpperCase()
  const codeFromCode = countries.isValid(upper) ? upper : null

  if (codeFromCode) {
    return {
      countryCode: codeFromCode,
      countryLabel: countries.getName(codeFromCode, 'en')
    }
  }

  const codeFromName = countries.getAlpha2Code(normalised, 'en')

  if (codeFromName) {
    return {
      countryCode: codeFromName,
      countryLabel: countries.getName(codeFromName, 'en')
    }
  }

  return {}
}

// Pick the most relevant address from address details and known addresses.
function selectAddress(addressDetails = [], addresses = []) {
  if (!Array.isArray(addressDetails) || addressDetails.length === 0) {
    return null
  }

  const addressesById = new Map()

  for (const address of addresses || []) {
    if (address?.defra_addressid) {
      addressesById.set(address.defra_addressid, address)
    }
  }

  const scored = []

  for (const detail of addressDetails) {
    if (!detail?.defra_addressid) {
      continue
    }

    const address = addressesById.get(detail.defra_addressid)

    if (!address) {
      continue
    }

    if (!isAddressDetailActive(detail)) {
      continue
    }

    const mapped = mapAddressDetail(detail, address)

    if (!mapped) {
      continue
    }

    scored.push({
      mapped,
      score: addressDetailScore(detail)
    })
  }

  if (scored.length === 0) {
    return null
  }

  scored.sort((a, b) => b.score - a.score)

  return scored[0].mapped
}

// Validate an address detail is active based on valid from/to.
function isAddressDetailActive(detail) {
  const now = Date.now()

  const validFrom = toDate(detail?.defra_validfrom)
  const validTo = toDate(detail?.defra_validto)

  if (validFrom && validFrom.getTime() > now) {
    return false
  }

  if (validTo && validTo.getTime() <= now) {
    return false
  }

  return true
}

// Score an address detail to decide which address to pick first.
function addressDetailScore(detail) {
  const type = normaliseString(detail?.defra_addresstype)?.toLowerCase()
  let score = 0

  if (type?.includes('correspondence')) {
    score += 3
  } else if (type?.includes('home')) {
    score += 2
  } else if (type) {
    score += 1
  }

  if (isAddressDetailActive(detail)) {
    score += 1
  }

  return score
}

// Build an address payload from address detail + address record.
function mapAddressDetail(detail, address) {
  const street = buildStreet([
    normaliseString(address?.defra_subbuildingname),
    normaliseString(address?.defra_buildingname) ||
      normaliseString(address?.defra_premises),
    normaliseString(address?.defra_street),
    normaliseString(address?.defra_locality),
    normaliseString(address?.defra_dependentlocality)
  ])

  const city = normaliseString(address?.defra_towntext)
  const state = normaliseString(address?.defra_county)
  const postalCode =
    normaliseString(address?.defra_postcode) ||
    normaliseString(address?.defra_internationalpostalcode)
  const { countryCode, countryLabel } = resolveCountry(address?.defra_countryid)

  const hasAddress =
    street || city || state || postalCode || countryCode || address?.defra_uprn

  if (!hasAddress) {
    return null
  }

  return {
    street,
    city,
    state,
    postalCode,
    countryCode,
    countryLabel,
    uprn: normaliseString(address?.defra_uprn),
    fromCompaniesHouse: toBoolean(address?.defra_fromcompanieshouse),
    addressType: normaliseString(detail?.defra_addresstype),
    phone: normaliseString(detail?.defra_phone),
    mobile: normaliseString(detail?.defra_mobile),
    fax: normaliseString(detail?.defra_fax),
    email: normaliseString(detail?.emailaddress)
  }
}

// Build an address from inline contact fields when no address detail is provided.
function mapInlineContactAddress(contact) {
  if (!contact) {
    return null
  }

  const street = buildStreet([
    valueWithFlag(contact, 'defra_addrsubbuildingname', {
      allowMissingFlag: true
    }),
    valueWithFlag(contact, 'defra_addrbuildingname', {
      allowMissingFlag: true
    }) ||
      valueWithFlag(contact, 'defra_addrbuildingnumber', {
        allowMissingFlag: true
      }),
    valueWithFlag(contact, 'defra_addrstreet', { allowMissingFlag: true }),
    valueWithFlag(contact, 'defra_addrlocality', { allowMissingFlag: true }),
    valueWithFlag(contact, 'defra_addrdependentlocality', {
      allowMissingFlag: true
    })
  ])

  const city = valueWithFlag(contact, 'defra_addrtown', {
    allowMissingFlag: true
  })
  const state = valueWithFlag(contact, 'defra_addrcounty', {
    allowMissingFlag: true
  })
  const postalCode =
    valueWithFlag(contact, 'defra_addrpostcode', { allowMissingFlag: true }) ||
    valueWithFlag(contact, 'defra_addrinternationalpostalcode', {
      allowMissingFlag: true
    })
  const { countryCode, countryLabel } = resolveCountry(
    valueWithFlag(contact, 'defra_addrcountryid', {
      allowMissingFlag: true
    })
  )
  const uprn = valueWithFlag(contact, 'defra_addruprn', {
    allowMissingFlag: true
  })
  const fromCompaniesHouse = valueWithFlag(
    contact,
    'defra_addrcofromcompanieshouse',
    {
      allowMissingFlag: true,
      transform: toBoolean
    }
  )

  const hasAddress =
    street || city || state || postalCode || countryCode || uprn

  if (!hasAddress) {
    return null
  }

  return {
    street,
    city,
    state,
    postalCode,
    countryCode,
    countryLabel,
    uprn,
    fromCompaniesHouse
  }
}

// Build an address from an account’s registered address fields.
function mapRegisteredAddress(account) {
  if (!account) {
    return null
  }

  const street = buildStreet([
    valueWithFlag(account, 'defra_addregsubbuildingname', {
      allowMissingFlag: true
    }),
    valueWithFlag(account, 'defra_addregbuildingname', {
      allowMissingFlag: true
    }) ||
      valueWithFlag(account, 'defra_addregbuildingnumber', {
        allowMissingFlag: true
      }),
    valueWithFlag(account, 'defra_addregstreet', { allowMissingFlag: true }),
    valueWithFlag(account, 'defra_addreglocality', { allowMissingFlag: true }),
    valueWithFlag(account, 'defra_addregdependentlocality', {
      allowMissingFlag: true
    })
  ])

  const city = valueWithFlag(account, 'defra_addregtown', {
    allowMissingFlag: true
  })
  const state = valueWithFlag(account, 'defra_addregcounty', {
    allowMissingFlag: true
  })
  const postalCode =
    valueWithFlag(account, 'defra_addregpostcode', {
      allowMissingFlag: true
    }) ||
    valueWithFlag(account, 'defra_addreginternationalpostalcode', {
      allowMissingFlag: true
    })
  const { countryCode, countryLabel } = resolveCountry(
    valueWithFlag(account, 'defra_addregcountryid', {
      allowMissingFlag: true
    })
  )

  const hasAddress = street || city || state || postalCode || countryCode

  if (!hasAddress) {
    return null
  }

  return {
    street,
    city,
    state,
    postalCode,
    countryCode,
    countryLabel,
    fromCompaniesHouse: valueWithFlag(
      account,
      'defra_addregfromcompanieshouse',
      {
        allowMissingFlag: true,
        transform: toBoolean
      }
    )
  }
}

// Copy address fields into a Salesforce body when present.
function applyAddressToBody(
  body,
  address,
  streetField,
  cityField,
  stateField,
  postalField,
  countryCodeField,
  countryLabelField
) {
  if (!address) {
    return
  }

  if (address.street !== undefined) {
    body[streetField] = address.street
  }

  if (address.city !== undefined) {
    body[cityField] = address.city
  }

  if (address.state !== undefined) {
    body[stateField] = address.state
  }

  if (address.postalCode !== undefined) {
    body[postalField] = address.postalCode
  }

  if (address.countryCode !== undefined) {
    body[countryCodeField] = address.countryCode
  }

  if (address.countryLabel !== undefined && countryLabelField) {
    body[countryLabelField] = address.countryLabel
  }
}

export {
  selectAddress,
  mapInlineContactAddress,
  mapRegisteredAddress,
  applyAddressToBody
}
