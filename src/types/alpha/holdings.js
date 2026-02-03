import { relationshipToOne } from './relationships.js'

export const HoldingsRelationship = relationshipToOne({
  plural: 'holdings',
  singular: 'holding'
})
