import Joi from 'joi'

import { LinksReference } from '../links.js'

const CompositeResponseItemSchema = Joi.object({
  body: Joi.object()
    .unknown(true)
    .required()
    .description('Response body from the sub-request'),
  httpHeaders: Joi.object()
    .unknown(true)
    .default({})
    .description('HTTP headers from the sub-request response'),
  httpStatusCode: Joi.number()
    .integer()
    .min(100)
    .max(599)
    .required()
    .description('HTTP status code from the sub-request'),
  referenceId: Joi.string()
    .required()
    .description('Reference ID matching the original request')
})
  .description('Individual composite response item')
  .label('Composite Response Item')

const CaseData = Joi.object({
  id: Joi.string().required().label('Case reference'),
  type: Joi.string()
    .valid('case-management-case')
    .required()
    .label('Case Management Case Creation')
    .description(
      'The "type" value will be "case-management-case" for this endpoint.'
    ),
  compositeResponse: Joi.array()
    .items(CompositeResponseItemSchema)
    .required()
    .description('Array of responses from composite sub-requests')
})
  .description('Salesforce composite response')
  .label('Case Composite Response')

// {
//     "compositeResponse": [
//         {
//             "body": {
//                 "totalSize": 1,
//                 "done": true,
//                 "records": [
//                     {
//                         "attributes": {
//                             "type": "RegulatoryAuthorizationType",
//                             "url": "/services/data/v62.0/sobjects/RegulatoryAuthorizationType/0ehPu0000000I6bIAE"
//                         },
//                         "Id": "0ehPu0000000I6bIAE"
//                     }
//                 ]
//             },
//             "httpHeaders": {},
//             "httpStatusCode": 200,
//             "referenceId": "licenseTypeQuery"
//         },
//         {
//             "body": {
//                 "id": "0iTPu00000015X7MAI",
//                 "success": true,
//                 "errors": [],
//                 "created": false
//             },
//             "httpHeaders": {
//                 "Location": "/services/data/v62.0/sobjects/IndividualApplication/0iTPu00000015X7MAI"
//             },
//             "httpStatusCode": 200,
//             "referenceId": "applicationRef"
//         },
//         {
//             "body": {
//                 "id": "068Pu00000L2CllIAF",
//                 "success": true,
//                 "errors": []
//             },
//             "httpHeaders": {
//                 "Location": "/services/data/v62.0/sobjects/ContentVersion/068Pu00000L2CllIAF"
//             },
//             "httpStatusCode": 201,
//             "referenceId": "file"
//         },
//         {
//             "body": {
//                 "attributes": {
//                     "type": "ContentVersion",
//                     "url": "/services/data/v62.0/sobjects/ContentVersion/068Pu00000L2CllIAF"
//                 },
//                 "ContentDocumentId": "069Pu00000KgSpBIAV",
//                 "Id": "068Pu00000L2CllIAF"
//             },
//             "httpHeaders": {},
//             "httpStatusCode": 200,
//             "referenceId": "fileQuery"
//         },
//         {
//             "body": {
//                 "id": "06APu00000Mjo8sMAB",
//                 "success": true,
//                 "errors": []
//             },
//             "httpHeaders": {
//                 "Location": "/services/data/v62.0/sobjects/ContentDocumentLink/06APu00000Mjo8sMAB"
//             },
//             "httpStatusCode": 201,
//             "referenceId": "linkfile"
//         }
//     ]
// }

export const CaseReference = Joi.object({
  data: CaseData.required(),
  links: LinksReference
})

export const Case = CaseData
