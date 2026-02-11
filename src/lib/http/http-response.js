import Joi from 'joi'

const ResponseMetaSchema = Joi.object({
  response: Joi.object({
    type: Joi.string().required()
  }).required()
}).unknown(true)

const extractResponseType = (schema) => {
  if (!schema || typeof schema.describe !== 'function') {
    throw new TypeError('Schema must be a Joi schema')
  }

  const metas = schema.describe().metas || []

  for (const meta of metas) {
    const { error, value } = ResponseMetaSchema.validate(meta)

    if (!error) {
      return value.response.type
    }
  }

  throw new TypeError('Schema meta must include response.type')
}

export class HTTPObjectResponse {
  /**
   * @param {import('joi').Schema} schema The Joi schema for this resource
   * @param {*} id The unique identifier for the resource
   * @param {Object | undefined | null} data The data of the resource
   */
  constructor(schema, id, data) {
    this.schema = schema
    this.type = extractResponseType(schema)
    this.id = id
    this.data = data || {}
    this.relationships = new Map()

    /**
     * define private links property
     */
    this._links = undefined
  }

  /**
   * set links for the top-level response
   * @param {Object} links
   */
  links(links) {
    this._links = links
    return this
  }

  /**
   * adds a new relationship to the response
   *
   * Each relationship is stored in a map with the type as the key and the value as a new
   * Map of HTTPObjectResponse instances identified by their unique `id`.
   *
   * If the `id` is not already present, it will be added.
   *
   * If the `id` is already present, it will be replaced with the new response.
   *
   * In the response, if there are multiple relationships of the same type, they will
   * be transformed into an array. Otherwise, it will be a single object.
   */
  relationship(type, response) {
    if (!(response instanceof HTTPObjectResponse)) {
      throw new TypeError('Response must be an instance of HTTPObjectResponse')
    }

    const relationship = this.relationships.get(type) || new Map()

    relationship.set(response.id, response)

    this.relationships.set(type, relationship)

    return this
  }

  _getRelationshipCardinality() {
    const description = this.schema.describe()
    const relationships = description?.keys?.relationships?.keys

    const map = {}

    if (relationships) {
      for (const [name, relDesc] of Object.entries(relationships)) {
        const dataDesc = relDesc?.keys?.data

        if (!dataDesc) {
          continue
        }

        map[name] = dataDesc.type === 'array' ? 'many' : 'one'
      }
    }

    return map
  }

  toResponse(isRoot = true) {
    const { type, id } = this

    if (!isRoot && this._links !== undefined) {
      throw new TypeError('Links are only supported on top-level responses')
    }

    const relationshipMap = this._getRelationshipCardinality()

    /**
     * @type {Record<string, unknown | Array<unknown>>}
     */
    const relationships = {}

    for (const [name, kind] of Object.entries(relationshipMap)) {
      relationships[name] = {
        data: kind === 'many' ? [] : null
      }
    }

    /**
     * transform the relationships map into a plain object
     * where each key is the relationship type and the value is either
     * a single object or an array of objects depending on the number of items
     * in the relationship.
     */
    for (const [type, items] of this.relationships.entries()) {
      const relationshipKind = relationshipMap?.[type]

      if (!relationshipKind) {
        throw new TypeError(`Relationship type "${type}" not defined in schema`)
      }

      if (relationshipKind === 'many') {
        const data = []

        for (const item of items.values()) {
          data.push(item.toResponse(false).data)
        }

        relationships[type] = { data }
      } else {
        const first = items.values().next().value

        relationships[type] = { data: first.toResponse(false).data }
      }
    }

    const data = {
      ...this.data,
      type,
      id
    }

    if (Object.keys(relationships).length > 0) {
      data.relationships = relationships
    }

    const response = { data }

    if (isRoot && this._links !== undefined) {
      response.links = this._links
    }

    return response
  }
}

export class HTTPArrayResponse {
  /**
   * @param {import('joi').Schema} schema The Joi schema for items in this array
   */
  constructor(schema) {
    this.schema = schema
    this.type = extractResponseType(schema)
    this.items = new Map()
    this._links = undefined
  }

  /**
   * set links for the top-level response
   * @param {Object} links
   */
  links(links) {
    this._links = links
    return this
  }

  /**
   * Add or replace an item in the response
   * @param {HTTPObjectResponse | *} id The HTTPObjectResponse or item id to add
   * @param {Object | undefined | null} data The data to add when passing an id
   */
  add(id, data) {
    const response =
      id instanceof HTTPObjectResponse
        ? id
        : new HTTPObjectResponse(this.schema, id, data)

    this.items.set(response.id, response)

    return this
  }

  /**
   * Remove an item by ID
   */
  remove(id) {
    this.items.delete(id)

    return this
  }

  toResponse() {
    const { items } = this

    const data = []

    for (const item of items.values()) {
      data.push(item.toResponse(false).data)
    }

    const response = { data }

    if (this._links !== undefined) {
      response.links = this._links
    }

    return response
  }
}
