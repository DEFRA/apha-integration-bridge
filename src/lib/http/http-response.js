export class HTTPObjectResponse {
  /**
   * @param {string} type The type of the resource
   * @param {*} id The unique identifier for the resource
   * @param {Object | undefined | null} data The data of the resource
   * @param {Object | undefined | null} links The links for the resource
   */
  constructor(type, id, data, links) {
    this.type = type
    this.id = id
    this.data = data || {}
    this.links = links || {}
    this.relationships = new Map()
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

  toResponse() {
    const { type, id, links } = this

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
        relationships[type] = items.values().next().value.toResponse()
      } else {
        relationships[type] = []

        for (const item of items.values()) {
          relationships[type].push(item.toResponse())
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

    return {
      data,
      links
    }
  }
}

export class HTTPArrayResponse {
  /**
   * @param {Object | undefined | null} links links for the response
   */
  constructor(links) {
    this.items = new Map()
    this.links = links || {}
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
    const { links, items } = this

    const data = []

    for (const item of items.values()) {
      data.push(item.toResponse().data)
    }

    return {
      data,
      links
    }
  }
}
