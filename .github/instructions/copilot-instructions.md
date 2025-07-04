---
applyTo: '**'
---

## Coding Styles & Standards

This is a Javascript project that uses Typescript typings to help with type safety, as configured in `/jsconfig.json`

All code should be written as verbosely and simply as possible, with no abbreviations or shorthand. Use descriptive variable names and avoid unnecessary complexity, for example:

```js
const matches = []

for (const item of items) {
  if (item.usernames && item.type === 'active') {
    matches.push(...item.usernames)
  }
}
```

Is preferred over a more complex, terse version such as:

```js
const matches = items
  .filter((item) => item.usernames && item.type === 'active')
  .flatMap((item) => item.usernames)
```

Maintainability and readability are prioritized over brevity. The code should be easy to understand for someone who is not familiar with the project.

The code should be well-structured and organized, with clear separation of concerns. Use modules to encapsulate functionality and avoid global variables.

The code should be thoroughly documented, with comments explaining the purpose of each function and any complex logic. Use JSDoc style comments for function documentation, including parameter and return types.

## Development Workflow

Before committing code, ensure that the following commands and checks pass successfully:

- `npm run lint` - This will check the code for style and formatting issues.
- `npm run test` - This will run the unit tests to ensure that the code is
- `npm run format` - This will format the code according to the project's style guide.

We use conventional commits for all commits to the repository. Although not enforced, it makes it easier to adopt semantic versioning and release in the future.

---

This repository provides a HAPI API that establishes connections to MongoDB and an OracleDB, through configuration.

All external internet connectivity is configured through a Squid proxy and must be whitelisted before being allowed.

A custom routing implementation is used, to allow for a NextJS style approach to routing within the API implementation.

Versioning is handled through a header, configured as a plugin in the HAPI server.

All queries executed against OracleDB, should have a "mocked" schema configured with dummy data associated with it facilitating the execution of the query. This enables full testing of the API locally, without the need to mock the OracleDB connection. OracleDB queries should never be mocked and always executed locally.
