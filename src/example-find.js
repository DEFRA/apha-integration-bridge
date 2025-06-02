/**
 * Fetches all documents in the `example-data` collection.
 *
 * @param {import('mongodb').Db} db Mongo database instance.
 * @returns {Promise<object[]>} Array of example documents.
 */
function findAllExampleData(db) {
  const cursor = db
    .collection('example-data')
    .find({}, { projection: { _id: 0 } })

  return cursor.toArray()
}

/**
 * Fetches a single example document by its identifier.
 *
 * @param {import('mongodb').Db} db Mongo database instance.
 * @param {string} id Identifier of the document to retrieve.
 * @returns {Promise<object | null>} The found document or `null`.
 */
function findExampleData(db, id) {
  return db
    .collection('example-data')
    .findOne({ exampleId: id }, { projection: { _id: 0 } })
}

export { findAllExampleData, findExampleData }
