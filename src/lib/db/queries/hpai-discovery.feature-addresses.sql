WITH feature_subtype AS (
  SELECT l.feature_pk, 'LOCATION' AS subtype
  FROM ahbrp.location l
  UNION ALL
  SELECT sl.feature_pk, 'SUB_LOCATION' AS subtype
  FROM ahbrp.sub_location sl
),
current_links AS (
  SELECT
    fa.feature_pk,
    COUNT(*) AS links,
    SUM(CASE WHEN a.address_to_date < SYSDATE THEN 1 ELSE 0 END) AS links_to_ended_addresses,
    SUM(CASE WHEN a.non_postal_address_ind = 'Y' THEN 1 ELSE 0 END) AS non_postal,
    SUM(CASE WHEN fa.feature_address_from_date > SYSDATE THEN 1 ELSE 0 END) AS future_dated
  FROM ahbrp.feature_address fa
  LEFT JOIN ahbrp.address a
    ON a.address_pk = fa.address_pk
  WHERE fa.feature_address_to_date IS NULL
  GROUP BY fa.feature_pk
)
SELECT
  subtype,
  current_addresses,
  COUNT(*) AS features,
  SUM(links_to_ended_addresses) AS links_to_ended_addresses,
  SUM(non_postal) AS non_postal_links,
  SUM(future_dated) AS future_dated_links
FROM (
  SELECT
    fst.subtype,
    CASE
      WHEN cl.links IS NULL THEN '0'
      WHEN cl.links = 1 THEN '1'
      WHEN cl.links = 2 THEN '2'
      ELSE '3+'
    END AS current_addresses,
    NVL(cl.links_to_ended_addresses, 0) AS links_to_ended_addresses,
    NVL(cl.non_postal, 0) AS non_postal,
    NVL(cl.future_dated, 0) AS future_dated
  FROM feature_subtype fst
  LEFT JOIN current_links cl
    ON cl.feature_pk = fst.feature_pk
)
GROUP BY subtype, current_addresses
ORDER BY subtype, current_addresses
