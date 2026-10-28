import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toContactMethods } from './to-contact-methods.js'

/**
 * @param {string} type
 * @param {string | null} value
 * @param {string | null} usageType
 * @param {string | null} preferred
 */
const contactRow = (type, value, usageType, preferred) => ({
  telecom_address_type: type,
  contact_value: value,
  address_usage_type: usageType,
  preferred_contact_method_ind: preferred
})

test('returns one entry per usage type', () => {
  expect(
    toContactMethods([
      contactRow('MOBILE', '07700 900001', 'HOME', 'Y'),
      contactRow('MOBILE', '07700 900001', 'SECONDARYCONTACT', 'N')
    ])
  ).toEqual([
    {
      type: 'mobile',
      phoneNumber: '07700 900001',
      isPreferred: true,
      usageType: 'HOME'
    },
    {
      type: 'mobile',
      phoneNumber: '07700 900001',
      isPreferred: false,
      usageType: 'SECONDARYCONTACT'
    }
  ])
})

test('merges duplicate links and keeps the preferred flag', () => {
  expect(
    toContactMethods([
      contactRow('MOBILE', '07700 900001', 'HOME', 'N'),
      contactRow('MOBILE', '07700 900001', 'HOME', 'Y')
    ])
  ).toEqual([
    {
      type: 'mobile',
      phoneNumber: '07700 900001',
      isPreferred: true,
      usageType: 'HOME'
    }
  ])
})

test('skips empty values and unknown types', () => {
  expect(
    toContactMethods([
      contactRow('EMAIL', null, null, null),
      contactRow('EMAIL', '   ', null, null),
      contactRow('PAGER', '01234 000003', null, null)
    ])
  ).toEqual([])
})

test('removes duplicates before masking', () => {
  const contactMethods = runWithMaskingContext({ shouldMask: true }, () =>
    toContactMethods([
      contactRow('MOBILE', '07700 900301', 'HOME', 'Y'),
      contactRow('MOBILE', '07700 900311', 'HOME', 'N'),
      contactRow('FAX', '01234 900303', null, null)
    ])
  )

  expect(contactMethods).toEqual([
    {
      type: 'mobile',
      phoneNumber: '0**********1',
      isPreferred: true,
      usageType: 'HOME'
    },
    {
      type: 'mobile',
      phoneNumber: '0**********1',
      isPreferred: false,
      usageType: 'HOME'
    },
    {
      type: 'fax',
      faxNumber: '0**********3',
      isPreferred: false,
      usageType: null
    }
  ])
})
