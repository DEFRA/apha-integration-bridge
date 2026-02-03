import { relationshipToOne } from './relationships.js'

export const LocationsRelationship = relationshipToOne({
  plural: 'locations',
  singular: 'location'
})
