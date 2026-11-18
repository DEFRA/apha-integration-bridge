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

Put `ANTHROPIC_API_KEY` in `.env.local` (create the file if it isn't there; git ignores it). The key comes from the Claude Console (platform.claude.com, Settings → API Keys) and needs credit on the account: a claude.ai login or subscription doesn't give API access. Then:

- **Alpha route:** `npm run dev`, then `POST /alpha/customers/find` with the ids listed in [the route's docs](../../routes/alpha/customers/find.md). Each call makes one model call per customer.
- **Scoring the prompt:** `npm run eval:memo` runs every labelled case 3 times against the configured model. Options: `--models claude-haiku-5-5,claude-sonnet-5-5`, `--repeats 5`, `--category "prompt injection"`, `--case roles-1`, `--concurrency 4`. It prints pass rate, status accuracy, name precision and recall, role accuracy, dropped (unverifiable) names, latency and tokens per category, then every failed run and every case whose answer changed between repeats. Full results go to `.eval-results/` (git-ignored).

Neither runs in `npm test`: the Jest setup removes `ANTHROPIC_API_KEY`, and tests inject a fake model.

## Moving to Bedrock

Set `MEMO_EXTRACTION_PROVIDER=bedrock` and `MEMO_EXTRACTION_MODEL_ID` to the model or inference profile CDP approve. The service's task role needs `bedrock:InvokeModel` on it. Nothing outside `model.js` changes. Still to confirm with CDP: whether Bedrock is reached through a VPC endpoint or the squid proxy (the AWS SDK doesn't use `proxyFetch`), and that Bedrock invocation logging is off.

## Findings

Scored on 18 November 2026: 39 invented cases, 3 repeats each, through the Anthropic API with Strands' structured output and `effort` left at each model's default (Haiku `medium`, Sonnet `high`). The four runs together cost about $2.54.

| Model      | Prompt | Pass rate      | Status accuracy | Name precision | Name recall | Unstable cases                      | p50 / p95 latency   | Notes                                                                                                                     |
| :--------- | :----- | :------------- | :-------------- | :------------- | :---------- | :---------------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| Haiku 5.5  | 1.0.0  | 94.0%          | 99.1%           | 93.8%          | 100%        | previous-2, contact-details-3       | 1.3s / 3.2s         | Took "JS (APHA)" for a person, a family surname for a previous contact, and the name in an email address for a candidate. |
| Sonnet 5.5 | 1.0.0  | 96.6%          | 97.4%           | 96.3%          | 100%        | contact-details-3                   | 1.7s / 4.0s         | Took "the Openshaw family" for a previous contact on every repeat; email name as above.                                   |
| Haiku 5.5  | 1.2.0  | 98.3%          | 100%            | 98.1%          | 100%        | names-only-2, roles-3               | 1.3s / 2.7s         | Family and email rules fixed. Still listed "JS (APHA)" as `apha_staff` in 2 of 3 repeats.                                 |
| Sonnet 5.5 | 1.2.0  | 100%           | 100%            | 100%           | 100%        | none                                | 1.9s / 4.4s         |                                                                                                                           |
| Haiku 5.5  | 1.3.0  | 100%           | 100%            | 100%           | 100%        | names-only-2 (both answers allowed) | 1.2s / 2.8s         | Current prompt.                                                                                                           |
| Sonnet 5.5 | 1.3.0  | 100% (18 runs) | 100%            | 100%           | 100%        | roles-3 (both forms allowed)        | 1.7–2.2s / 2.4–5.8s | Only the two categories 1.3.0 changed: several people with roles, titles and initials.                                    |

What changed in the prompt:

- **1.1.0 / 1.2.0:** a family or household named by its surname, an email address or username, and initials with a role or organisation next to them are all listed as not a person. 1.1.0 quoted three of the scored memos as its examples, which breaks the rule at the top of `eval/cases.js`; 1.2.0 replaced them with invented ones, so its results are the honest measure. Prompt 1.1.0 was never committed.
- **1.3.0:** the `apha_staff` role no longer reads as "whoever wrote the note", and initials count only alongside a written-out name. That was what made Haiku pick up staff initials.

What the spike shows:

- **Both models find every person in the set** (recall 100% on every run) and never followed an injected instruction. Every miss was an extra name, not a missing one, and all three kinds were fixed by saying in the prompt what isn't a person.
- **Haiku 5.5 is the model to take forward.** On prompt 1.3.0 it matches Sonnet on this set, answers faster (p95 about 2.8s against Sonnet's 4.4s, well inside the 15s deadline), and costs about **$0.37 per 1,000 memos** against Sonnet's **$6.40** (about 2,500 input and 240 output tokens per memo on Haiku, 2,450 and 155 on Sonnet). 39 cases can't separate two models that both score 100%, so Sonnet stays the fallback if real memos show Haiku missing things.
- **The validator does its job.** In one repeat Haiku split "Mr & Mrs Eccleston" into "Mrs Eccleston", which isn't written in the memo; the validator dropped it and the answer came back `ambiguous` (`UNVERIFIED_NAMES`) rather than an invented name.
- **Strands' structured output works on both models** through the Anthropic provider: no call came back `unavailable`. This was the known spike risk; on Bedrock it is still untested.
- **The scoring script needed one fix:** a case that accepts `ambiguous` could never pass with one, because an ambiguous answer has to list its candidates and every candidate counted as a wrong name. Such a case can now list `ambiguousCandidates`.
- **A judgement for the business to confirm:** "the Openshaw family" is treated as no person. If former occupiers named only by surname are worth keeping as previous contacts, the rule in `prompt.md` and the label for previous-2 change together.

Known gaps in the spike:

- "Contact" isn't defined by the business yet, so the prompt returns every person with a role rather than choosing one.
- No caching, metrics or rate limiting beyond the per-request concurrency limit.
- The real `POST /customers/find` route doesn't read `AH_MEMO` yet; it would also need to mask names (`mask()` already runs inside `extractMemoContacts`).
