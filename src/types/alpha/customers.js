import { relationshipToOne } from './relationships.js'

export const CustomerRelationship = relationshipToOne({
  plural: 'customers',
  singular: 'customer'
})
