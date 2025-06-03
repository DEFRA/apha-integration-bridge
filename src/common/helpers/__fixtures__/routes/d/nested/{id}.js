export const handler = (request) => {
  const { id } = request.params

  return { id }
}
