import Joi from 'joi'

export const CommoditiesData = Joi.object({
  type: Joi.string()
    .valid('commodities')
    .required()
    .label('Commodity Type')
    .description('The “type” value will be "commodities" for this endpoint.'),
  id: Joi.string().required().label('Commodity ID')
}).meta({ response: { type: 'commodities' } })

export const CommoditiesReference = Joi.object({
  data: CommoditiesData.allow(null).required()
})
