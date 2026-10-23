import Joi from 'joi'

import { LocationsSchema } from './find/locations.js'

const Holdership = Joi.object({
  vetnetCoreId: Joi.string()
    .required()
    .description(
      "SAM's Vetnet core id. With the CPH it identifies the holdership"
    ),
  from: Joi.string()
    .required()
    .allow(null)
    .description('Start of the holdership'),
  cphType: Joi.string()
    .required()
    .allow(null)
    .description("The holdership's CPH type"),
  selected: Joi.boolean()
    .required()
    .description(
      'True on the holdership `POST /holdings/find` reports: the latest `from`, then the highest SAM key'
    )
}).label('Holdership')

/**
 * An item of `GET /holdings/{countyId}/{parishId}/{holdingId}/locations`: the
 * location as `POST /locations/find` returns it, plus the holdership that
 * links it to the CPH.
 */
export const HoldingLocation = LocationsSchema.keys({
  holdership: Holdership.required()
}).label('Holding location')
