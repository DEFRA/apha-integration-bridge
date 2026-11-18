# Memo contact extraction (spike, DSFAAP-2993)

Extracts the names of people from SAM's free-text `AH_MEMO` field with an LLM, through [Strands Agents](https://strandsagents.com), as the AI guidance team advised (_APHA memo field extraction advice_, 21 October 2026). This is a spike: it runs only on the unauthenticated `POST /alpha/customers/find` mock route, against invented memos.

## Data rule

**Only invented memos may be sent while the provider is `anthropic`.** The Anthropic API is not the route the advice approves for real data. Real SAM memos wait for the CDP Bedrock route, a DPIA update and the assurance steps in the advice.

## How it works

```
memo ─► prepare ─► model (Strands) ─► validate ─► memoContacts
        trim,       versioned prompt,   every name must
        empty and   structured output   appear in the memo
        length      (Zod schema)        (exact / normalised)
        checks
```

| File                      | Role                                                                                                                                                                                                     |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.js`                | `extractMemoContacts(memo)`: the public API. Never throws; any failure is `status: unavailable` with a reason code.                                                                                      |
| `model.js`                | The only code that imports Strands. Builds a new agent per memo (Anthropic or Bedrock model, no tools), with the deadline as its cancel signal. Turns vendor errors into `MemoModelError` codes.         |
| `prompt.md` / `prompt.js` | The system prompt and its examples, and `PROMPT_VERSION`. **Bump the version on any change to the prompt or schema.** The memo goes in `<memo>` tags and the prompt treats it as data, not instructions. |
| `schema.js`               | What the model must return: `status`, `reasonCode`, `persons[{ name, role }]`.                                                                                                                           |
| `validate.js`             | The reliability checks. See below.                                                                                                                                                                       |
| `eval/cases.js`           | About 40 labelled, invented memos across 12 variations.                                                                                                                                                  |
| `eval/score.js`           | Scoring used by `npm run eval:memo`.                                                                                                                                                                     |

### How reliable a result is

The advice is not to use the model's own "confidence". Reliability comes from checks in code instead:

| `status`      | Meaning                                                                                                | What the consumer should do                 |
| :------------ | :----------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| `found`       | The model named people and **every** name was found in the memo.                                       | Show the names as a lead to confirm in SAM. |
| `none`        | No people named, or the memo is empty.                                                                 | "No contact name in the memo. Check SAM."   |
| `ambiguous`   | The model wasn't sure, its answer contradicted itself, or it returned a name the memo doesn't contain. | "Check SAM." Any candidates are listed.     |
| `unavailable` | Not configured, timed out, model error, invalid output, memo too long.                                 | "Extraction unavailable. Check SAM."        |

Each contact also has `sourceMatch`: `exact` (in the memo as written) or `normalised` (only once case and punctuation are ignored). One unverifiable name makes the whole result `ambiguous` (`UNVERIFIED_NAMES`), because the rest of that answer can't be trusted either.

## Running it

Put `ANTHROPIC_API_KEY` in `.env.local`. Then:

- **Alpha route:** `npm run dev`, then `POST /alpha/customers/find` with the ids listed in [the route's docs](../../routes/alpha/customers/find.md). Each call makes one model call per customer.
- **Scoring the prompt:** `npm run eval:memo` runs every labelled case 3 times against the configured model. Options: `--models claude-haiku-5-5,claude-sonnet-5-5`, `--repeats 5`, `--category "prompt injection"`, `--case roles-1`, `--concurrency 4`. It prints pass rate, status accuracy, name precision and recall, role accuracy, dropped (unverifiable) names, latency and tokens per category, then every failed run and every case whose answer changed between repeats. Full results go to `.eval-results/` (git-ignored).

Neither runs in `npm test`: the Jest setup removes `ANTHROPIC_API_KEY`, and tests inject a fake model.

## Moving to Bedrock

Set `MEMO_EXTRACTION_PROVIDER=bedrock` and `MEMO_EXTRACTION_MODEL_ID` to the model or inference profile CDP approve. The service's task role needs `bedrock:InvokeModel` on it. Nothing outside `model.js` changes. Still to confirm with CDP: whether Bedrock is reached through a VPC endpoint or the squid proxy (the AWS SDK doesn't use `proxyFetch`), and that Bedrock invocation logging is off.

## Findings

_To be filled in from the first scoring runs._

| Model | Prompt | Pass rate | Status accuracy | Name precision | Name recall | Unstable cases | p95 latency | Notes |
| :---- | :----- | :-------- | :-------------- | :------------- | :---------- | :------------- | :---------- | :---- |
|       |        |           |                 |                |             |                |             |       |

Known gaps in the spike:

- "Contact" isn't defined by the business yet, so the prompt returns every person with a role rather than choosing one.
- No caching, metrics or rate limiting beyond the per-request concurrency limit.
- The real `POST /customers/find` route doesn't read `AH_MEMO` yet; it would also need to mask names (`mask()` already runs inside `extractMemoContacts`).
