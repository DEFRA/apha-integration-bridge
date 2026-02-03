import { relationshipToOne } from './helpers.js'

export const LocationsRelationship = relationshipToOne({
  plural: 'locations',
  singular: 'location'
})
