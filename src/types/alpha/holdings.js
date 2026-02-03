import { relationshipToOne } from './helpers.js'

export const HoldingsRelationship = relationshipToOne({
  plural: 'holdings',
  singular: 'holding'
})
