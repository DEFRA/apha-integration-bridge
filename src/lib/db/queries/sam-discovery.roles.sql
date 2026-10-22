SELECT
  r.main_role_type,
  r.role_type,
  r.performs_visits_indicator,
  r.workgroup_role_indicator,
  r.role_effective_from_date,
  r.role_effective_to_date
FROM ahbrp.role r
ORDER BY r.main_role_type, r.role_type
