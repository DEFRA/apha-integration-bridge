import { relationshipSchema } from './relationships.js'

export const CustomerRelationship = relationshipSchema({
  plural: 'customers',
  singular: 'customer'
})
