import Joi from 'joi'

export const CustomersData = Joi.object({
  type: Joi.string()
    .valid('customers')
    .required()
    .label('Customer Type')
    .description('The “type” value will be "customers" for this endpoint.'),
  id: Joi.string().required().label('Customer ID')
}).meta({ response: { type: 'customers' } })

export const CustomersReference = Joi.object({
  data: CustomersData.allow(null).required()
})
