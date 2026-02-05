export class HTTPObjectResponse {
  /**
   * @param {string} type The type of the resource
   * @param {*} id The unique identifier for the resource
   * @param {Object | undefined | null} data The data of the resource
   */
  constructor(type, id, data) {
    this.type = type
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
   * @returns {HTTPObjectResponse} this
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

  toResponse(isRoot = true) {
    const { type, id } = this

    if (!isRoot && this._links !== undefined) {
    throw new TypeError(
   `Links are only supported on top-level responses (resource type: ${type}, id: ${id})`
  )
    }

    /**
     * @type {Object | undefined}
     */
    let relationships

    if (this.relationships.size > 0) {
      relationships = {}
    }

    /**
     * transform the relationships map into a plain object
     * where each key is the relationship type and the value is either
     * a single object or an array of objects depending on the number of items
     * in the relationship.
     */
    for (const [type, items] of this.relationships.entries()) {
      if (items.size === 1) {
        relationships[type] = items.values().next().value.toResponse(false)
      } else {
        relationships[type] = []

        for (const item of items.values()) {
          relationships[type].push(item.toResponse(false))
        }
      }
    }

    const data = {
      ...this.data,
      type,
      id
    }

    if (relationships) {
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
  constructor() {
    this.items = new Map()
    this._links = undefined
  }

  /**
   * set links for the top-level response
   * @param {Object} links
   * @return {HTTPArrayResponse} this
   */
  links(links) {
    this._links = links
    return this
  }

  /**
   * Add or replace an item in the response
   * @param {HTTPObjectResponse} response The HTTP Response object to add
   */
  add(response) {
    if (!(response instanceof HTTPObjectResponse)) {
      throw new TypeError('Response must be an instance of HTTPObjectResponse')
    }

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
