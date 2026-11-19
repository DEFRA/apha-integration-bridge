# Memo contact extraction (spike, DSFAAP-2993)

Extracts the names of people from SAM's free-text `AH_MEMO` field with an LLM, through [Strands Agents](https://strandsagents.com), as the AI guidance team advised (_APHA memo field extraction advice_, 21 October 2026). This is a spike: it runs only on the unauthenticated `POST /alpha/customers/find` mock route, against invented memos.

## Data rule

**Only invented memos may be sent while the provider is `anthropic`.** The Anthropic API is not the route the advice approves for real data. Real SAM memos wait for the CDP Bedrock route, a DPIA update and the assurance steps in the advice.

## How it works

```
memo ─► prepare ─► model (Strands) ─► validate ─► memoContacts
        trim,       versioned prompt,   every name must
        empty and   structured output   appear in the memo
        length      (strict Zod         (exact / normalised)
        checks      schema)
```

| File                      | Role                                                                                                                                                                                                                     |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.js`                | `extractMemoContacts(memo)`: the public API. Never throws; any failure is `status: unavailable` with a reason code. `VERSIONS` gathers the prompt, schema and policy versions every result carries.                      |
| `model.js`                | The only code that imports Strands. Builds a new agent per memo (Anthropic or Bedrock model, no tools), with the deadline as its cancel signal. Turns vendor errors into `MemoModelError` codes.                         |
| `prompt.md` / `prompt.js` | The system prompt and its examples, and `PROMPT_VERSION`. **Bump it on any change to the prompt.** The memo goes in `<memo>` tags and the prompt treats it as data, not instructions.                                    |
| `schema.js`               | What the model must return: `status`, `reasonCode`, `persons[{ name, role }]`, and `SCHEMA_VERSION`. Strict: an answer with any other field is invalid output (`unavailable`, `INVALID_OUTPUT`), not quietly trimmed.    |
| `validate.js`             | The reliability checks (see below), and `POLICY_VERSION`. **Bump it on any change to those rules.**                                                                                                                      |
| `eval/LABELLING.md`       | How to label a scoring case: who counts as a person, statuses, roles, and how two labellers settle a disagreement.                                                                                                       |
| `eval/cases.js`           | The development set: 39 labelled, invented memos across 12 variations. The prompt is tuned against these.                                                                                                                |
| `eval/held-out-cases.js`  | The locked test set: 36 invented memos in the same 12 variations, written from `LABELLING.md` by someone who hadn't seen the prompt or the development set, and checked by a second labeller. **Never tune against it.** |
| `eval/baselines/`         | Two non-AI baselines, scored like a model: hand-written patterns (`rules.js`) and the `compromise` named-entity recogniser (`ner.js`, a dev dependency used only here).                                                  |
| `eval/score.js`           | Scoring used by `npm run eval:memo`.                                                                                                                                                                                     |

### How reliable a result is

The advice is not to use the model's own "confidence". Reliability comes from checks in code instead:

| `status`      | Meaning                                                                                                | What the consumer should do                 |
| :------------ | :----------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| `found`       | The model named people and **every** name was found in the memo.                                       | Show the names as a lead to confirm in SAM. |
| `none`        | No people named, or the memo is empty.                                                                 | "No contact name in the memo. Check SAM."   |
| `ambiguous`   | The model wasn't sure, its answer contradicted itself, or it returned a name the memo doesn't contain. | "Check SAM." Any candidates are listed.     |
| `unavailable` | Not configured, timed out, model error, invalid output, memo too long.                                 | "Extraction unavailable. Check SAM."        |

Each contact also has `sourceMatch`: `exact` (in the memo as written) or `normalised` (only once case and punctuation are ignored). One unverifiable name makes the whole result `ambiguous` (`UNVERIFIED_NAMES`), because the rest of that answer can't be trusted either.

A memo naming several people comes back `found`, with each person's role. The advice's default is `ambiguous` for several names "unless the business contract explicitly supports multiple named roles"; this contract does, and the business needs to confirm that is what they want (see the open questions below).

Every result's `meta` gives the model id and the prompt, schema and policy versions, and the route logs them with each extraction, so any answer can be traced to what produced it.

### Model settings

`effort` is pinned (`MEMO_EXTRACTION_EFFORT`, default `medium`) rather than left to the model default, so a provider changing its default can't silently change answers. The advice asks for low temperature, but current Claude models reject any non-default `temperature`, so effort is the only sampling setting; how often an answer changes between identical calls is measured by the scoring script instead (the "unstable cases" below).

## Running it

Put `ANTHROPIC_API_KEY` in `.env.local` (create the file if it isn't there; git ignores it). The key comes from the Claude Console (platform.claude.com, Settings → API Keys) and needs credit on the account: a claude.ai login or subscription doesn't give API access. Then:

- **Alpha route:** `npm run dev`, then `POST /alpha/customers/find` with the ids listed in [the route's docs](../../routes/alpha/customers/find.md). Each call makes one model call per customer.
- **Scoring:** `npm run eval:memo` runs every development case 3 times against the configured model. Options: `--set held-out` (the locked set), `--models claude-haiku-5-5,claude-sonnet-5-5,baseline:rules,baseline:ner` (baselines are free and need no key), `--repeats 5`, `--category "prompt injection"`, `--case roles-1`, `--concurrency 4`. It prints pass rate, status accuracy, name precision and recall, role accuracy, dropped (unverifiable) names, latency and tokens per category, then every failed run and every case whose answer changed between repeats. Full results go to `.eval-results/` (git-ignored).

Neither runs in `npm test`: the Jest setup removes `ANTHROPIC_API_KEY`, and tests inject a fake model.

**Using the held-out set.** Score it once per prompt or policy version, after development is done, and record the result here. If it shows a problem, fix it against the development set (add a development case like it), never by editing a held-out case or quoting one in the prompt. Once a fix has been made because of a held-out result, that set is no longer blind for that kind of memo: write fresh held-out cases before claiming the fix works.

## Moving to Bedrock

Set `MEMO_EXTRACTION_PROVIDER=bedrock`, `MEMO_EXTRACTION_MODEL_ID` to the model or inference profile CDP approve, and `AWS_REGION` if it isn't `eu-west-2`. The service's task role needs `bedrock:InvokeModel` on it. Nothing outside `model.js` changes. Still to confirm with CDP: whether Bedrock is reached through a VPC endpoint or the squid proxy (the AWS SDK doesn't use `proxyFetch`), and that Bedrock invocation logging is off.

What we know so far:

- **Model IDs.** In Europe, Haiku 5.5 and Sonnet 5.5 can only be called through an inference profile, `eu.anthropic.claude-haiku-5-5` or `eu.anthropic.claude-sonnet-5-5`, not the plain model ID. An `eu.` profile can serve a request from any EU region, so CDP's account has to allow that, or name the profile it does allow.
- **Turning a Claude model on** is a one-off step per account. Accept the model's Marketplace agreement (`aws bedrock create-foundation-model-agreement`), or let the first call accept it, which needs `aws-marketplace:Subscribe`. Then check `aws bedrock get-foundation-model-availability` shows every field `AVAILABLE`. Anthropic's use-case form isn't needed for models from Claude Opus 4.7 on.
- **The first check once access is granted:** `npm run eval:memo -- --case roles-1 --repeats 1` with the settings above, then a full Haiku run (117 calls, about $0.05 at Anthropic's own prices). That shows whether Strands' structured output works on Bedrock. If it doesn't, `model.js` drops `structuredOutputSchema`, asks for JSON in the prompt and checks it with `schema.js`.
- **A personal account didn't get that far** (19 November 2026). With no CDP account yet, we tried a personal AWS account: AWS's newer "project" sign-up, free plan, `eu-north-1`. Bedrock listed both models and invocation logging was off. We accepted Haiku 5.5's agreement, and the availability check then showed every field `AVAILABLE`. Every call still failed with `AccessDeniedException`: "not available for this account". AWS's docs say that case needs extra account-level access, arranged through AWS Sales. We stopped there, because the test would only have answered the structured-output question, and a CDP account answers that too.

## Findings

### Development set

Scored on 18 November 2026: 39 invented cases, 3 repeats each, through the Anthropic API with Strands' structured output and `effort` left at each model's default (Haiku `medium`, Sonnet `high`). The four runs together cost about $2.54. **These scores are on the cases the prompt was tuned against**, so they show the prompt doing what it was written to do, not how it does on memos it hasn't seen; the held-out results below are the fair measure.

| Model      | Prompt | Pass rate      | Status accuracy | Name precision | Name recall | Unstable cases                      | p50 / p95 latency   | Notes                                                                                                                     |
| :--------- | :----- | :------------- | :-------------- | :------------- | :---------- | :---------------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| Haiku 5.5  | 1.0.0  | 94.0%          | 99.1%           | 93.8%          | 100%        | previous-2, contact-details-3       | 1.3s / 3.2s         | Took "JS (APHA)" for a person, a family surname for a previous contact, and the name in an email address for a candidate. |
| Sonnet 5.5 | 1.0.0  | 96.6%          | 97.4%           | 96.3%          | 100%        | contact-details-3                   | 1.7s / 4.0s         | Took "the Openshaw family" for a previous contact on every repeat; email name as above.                                   |
| Haiku 5.5  | 1.2.0  | 98.3%          | 100%            | 98.1%          | 100%        | names-only-2, roles-3               | 1.3s / 2.7s         | Family and email rules fixed. Still listed "JS (APHA)" as `apha_staff` in 2 of 3 repeats.                                 |
| Sonnet 5.5 | 1.2.0  | 100%           | 100%            | 100%           | 100%        | none                                | 1.9s / 4.4s         |                                                                                                                           |
| Haiku 5.5  | 1.3.0  | 100%           | 100%            | 100%           | 100%        | names-only-2 (both answers allowed) | 1.2s / 2.8s         | Current prompt.                                                                                                           |
| Sonnet 5.5 | 1.3.0  | 100% (18 runs) | 100%            | 100%           | 100%        | roles-3 (both forms allowed)        | 1.7–2.2s / 2.4–5.8s | Only the two categories 1.3.0 changed: several people with roles, titles and initials.                                    |

What changed in the prompt:

- **1.1.0 / 1.2.0:** a family or household named by its surname, an email address or username, and initials with a role or organisation next to them are all listed as not a person. 1.1.0 quoted three of the scored memos as its examples, which breaks the rule at the top of `eval/cases.js`; 1.2.0 replaced them with invented ones. Prompt 1.1.0 was never committed.
- **1.3.0:** the `apha_staff` role no longer reads as "whoever wrote the note", and initials count only alongside a written-out name. That was what made Haiku pick up staff initials.

### Held-out set and baselines

Scored once on 18 November 2026 with prompt 1.3.0, schema 1.0.0, policy 1.0.0 and `effort` pinned at `medium` for both models (Sonnet's earlier runs used its default, `high`). Models: 36 cases, 3 repeats, about $0.81 for both. Baselines: 1 run each (they always give the same answer), free.

| Extractor      | Set      | Pass rate       | Status accuracy | Name precision | Name recall | Role accuracy | p50 / p95 latency | Cost per 1,000 memos |
| :------------- | :------- | :-------------- | :-------------- | :------------- | :---------- | :------------ | :---------------- | :------------------- |
| Rules baseline | dev      | 64.1%           | 76.9%           | 78.9%          | 42.9%       | 66.7%         | under 1ms         | nil                  |
| NER baseline   | dev      | 61.5%           | 82.1%           | 64.7%          | 62.9%       | (no roles)    | 1ms / 6ms         | nil                  |
| Rules baseline | held-out | 50.0%           | 72.2%           | 77.8%          | 48.8%       | 47.4%         | under 1ms         | nil                  |
| NER baseline   | held-out | 55.6%           | 80.6%           | 62.7%          | 74.4%       | (no roles)    | 1ms / 11ms        | nil                  |
| **Haiku 5.5**  | held-out | 94.4% (102/108) | 94.4%           | **100%**       | 95.3%       | 97.3%         | 1.5s / 3.6s       | about $0.43          |
| **Sonnet 5.5** | held-out | 97.2% (105/108) | 97.2%           | **100%**       | 97.7%       | 100%          | 1.9s / 3.9s       | about $7.05          |

Failures on the held-out set:

- **`ho-contact-details-3`, both models, every repeat: a gap in the validator, not the models.** "TEL:01632960234JOHNSTONE(SON)" runs a name straight into a phone number. Both models returned JOHNSTONE, but policy 1.0.0 treats digits as part of a word, so it couldn't find the name in the memo and turned the answer `ambiguous` (`UNVERIFIED_NAMES`). The result fails safe (check SAM), but a correct name is lost. Fixing it (a letter next to a digit as a word boundary) is a policy change for the next round, measured on new held-out cases, not on this one.
- **`ho-names-only-3`, Haiku, every repeat:** the memo is just "Thornbury". Haiku said `none`; the label accepts `found` or `ambiguous`, and Sonnet gave one of those. A missed possible name, which tells the user to check SAM, rather than an invented one.

What the held-out run shows:

- **Neither model gave a single name that wasn't a person in the memo** (precision 100% for both): the error the advice rates most serious, because a false name could mislead a verification. Every failure is a missed or unverifiable name, which leaves the user with the manual SAM check.
- **Both models are well clear of the non-AI baselines.** The rules find fewer than half the people; the recogniser finds more but about a third of what it returns isn't a person (or not the name as written: it gave "Gwen" for "Gwen Pritchard"), and neither can give a role or say "not sure". That is the evidence the advice asks for that an LLM is warranted here.
- **Haiku 5.5 is still the model to take forward.** Leaving out the validator gap, it passes 102 of 105 runs against Sonnet's 105, at about a sixteenth of the cost and a little faster. Its one extra miss is a lone ambiguous surname. Sonnet stays the pre-evaluated fallback.
- **Haiku's answer changed between repeats once** (`ho-casing-2`: one or both spellings of a misspelt surname, both allowed). Sonnet's never did.
- **These are small invented sets**, written and labelled by AI agents, not the independently labelled representative data the advice requires before production. Even Sonnet passing all 35 scorable cases only shows, at 95% confidence, a true pass rate above about 91% on memos like these (repeats of one memo aren't independent evidence). The numbers justify moving to the evaluation stage, not production.

Second labelling changed three held-out labels before scoring (the reason is in each case's `note`): `ho-titles-1` (a joint title), `ho-casing-2` (one or both spellings) and `ho-titles-3` (a role). It also found the JOHNSTONE gap and removed two alternative name forms that could never pass validation. A test now checks that every expected name in both sets can be found in its memo.

## Known gaps and open questions

Gaps in the spike:

- No caching, metrics or rate limiting beyond the per-request concurrency limit; no circuit breaker or dead-letter queue (later stages of the advice).
- The real `POST /customers/find` route doesn't read `AH_MEMO` yet; it would also need to mask names (`mask()` already runs inside `extractMemoContacts`).
- A name run straight into digits can't be verified (above).
- Bedrock is untested, including whether its structured output behaves as the Anthropic API's does. A personal AWS account couldn't get access to Claude models (see "Moving to Bedrock"), so this waits for CDP.

Questions for the business (the advice's "immediate decisions" and open questions):

- **What "contact" means.** The prompt returns every person with a role rather than choosing one.
- **Several people.** Is returning several people with roles (`found`) what they want, as the advice allows, or should several names mean "check SAM" (`ambiguous`)?
- **Joint titles.** "Mr & Mrs D Halloran" comes back as one name as written. Should it be two people? "Mr D Halloran" isn't written in the memo, so returning it would need a validator rule for joint titles.
- **Families.** "The Openshaw family" is treated as no person. If former occupiers named only by surname are worth keeping as previous contacts, the rule in `prompt.md` and the labels change together.
- **Acceptance thresholds**, signed before the evaluation on real data: the false-name rate they will accept (zero so far) and the miss rate.
