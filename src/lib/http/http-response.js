export class HTTPResponse {
  /**
   *
   * @param {string} type the type of the resource
   * @param {*} id the unique identifier for the resource
   * @param {*} attributes the attributes of the resource
   */
  constructor(type, id, attributes) {
    this.type = type
    this.id = id
    this.attributes = attributes
  }

  toJSON() {
    const { type, id, attributes } = this

    return {
      data: {
        type,
        id,
        ...attributes
      }
    }
  }
}
