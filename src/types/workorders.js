import Joi from 'joi'

export const WorkorderIdSchema = Joi.string()
  .trim()
  .pattern(/^WS-\d+$/i)
  .min(1)
  .required()

// These fields are only mandatory when the activity is resolved as
// completed. The `is` needs its own .required(), otherwise an absent
// closing reason would still match the branch. Presence only — Sam does
// the format validation and reports field errors itself.
const requiredWhenCompleted = {
  is: Joi.valid('Resolved-Completed').required(),
  then: Joi.required()
}

export const StandardWorkSchema = Joi.object({
  workscheduleid: Joi.string()
    .required()
    .description('Sam Work Schedule identifier, e.g. WS-12345'),
  workscheduleactivityid: Joi.string()
    .required()
    .description(
      'Sam Work Schedule Activity identifier, a child of the work schedule, e.g. WSA-100023'
    ),
  activityclosingreason: Joi.string()
    .required()
    .description(
      "Resolution state: 'Resolved-Completed' or 'Resolved-Not-Required'"
    ),
  businessresource: Joi.string()
    .required()
    .description('Email address of the business user making this data update'),
  activityscheduleddate: Joi.string().description(
    'Date the work was scheduled for, e.g. 2025-09-18T12:00:00Z (always optional)'
  ),
  resourcecompletingactivity: Joi.string()
    .when('activityclosingreason', requiredWhenCompleted)
    .description(
      "Email address of the Sam operator who performed the task (mandatory when activityclosingreason is 'Resolved-Completed')"
    ),
  activityactualstartdate: Joi.string()
    .when('activityclosingreason', requiredWhenCompleted)
    .description(
      "Activity actual start date (mandatory when activityclosingreason is 'Resolved-Completed')"
    ),
  activitycompletiondate: Joi.string()
    .when('activityclosingreason', requiredWhenCompleted)
    .description(
      "Activity completion date (mandatory when activityclosingreason is 'Resolved-Completed')"
    )
})
  .description(
    'A standard work update; presence is validated (including the fields that are conditionally mandatory on activityclosingreason), formats are not'
  )
  .label('Standard Work Update')
