import { relationshipToOne } from './helpers.js'

export const CustomerRelationship = relationshipToOne({
  plural: 'customers',
  singular: 'customer'
})
