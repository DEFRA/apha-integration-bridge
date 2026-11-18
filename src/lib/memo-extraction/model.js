/**
 * The only module that knows about Strands Agents or a model provider. It
 * turns one memo into the model's structured output, and every vendor error
 * into a MemoModelError carrying one of our own codes.
 *
 * Strands is loaded lazily, on the first real call, so tests that inject a
 * fake model (and the rest of the app) never load it.
 */
import { config } from '../../config.js'
import { proxyFetch } from '../../common/helpers/proxy/proxy-fetch.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { ModelOutputSchema } from './schema.js'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js'

/**
 * @typedef {'TIMEOUT' | 'INVALID_OUTPUT' | 'MODEL_ERROR'} MemoModelErrorCode
 * @typedef {{ inputTokens: number, outputTokens: number }} TokenUsage
 * @typedef {{ output: import('./schema.js').ModelOutput, usage: TokenUsage | null }} ModelResponse
 * @typedef {{ extract: (memo: string, options: { signal: AbortSignal }) => Promise<ModelResponse> }} MemoModel
 * @typedef {ReturnType<typeof getMemoExtractionConfig>} MemoExtractionConfig
 */

export const getMemoExtractionConfig = () => config.get('memoExtraction')

/**
 * Failure talking to the model. Carries our code only: never the memo, the
 * model's output or the provider's message text.
 */
export class MemoModelError extends Error {
  /**
   * @param {MemoModelErrorCode} code
   * @param {{ cause?: unknown }} [options]
   */
  constructor(code, options) {
    super(`Memo extraction model call failed: ${code}`, options)

    this.name = 'MemoModelError'
    this.code = code
  }
}

/**
 * @param {MemoExtractionConfig} cfg
 */
export const isModelConfigured = (cfg) =>
  cfg.provider === 'bedrock' || Boolean(cfg.anthropicApiKey)

let strandsLoggingConfigured = false

/**
 * Strands logs warnings and errors to the console by default. Route them
 * through the app logger instead, as plain messages (no arguments that could
 * carry request content).
 *
 * @param {typeof import('@strands-agents/sdk')} strands
 */
const configureStrandsLogging = (strands) => {
  if (strandsLoggingConfigured) {
    return
  }

  const logger = createLogger()

  strands.configureLogging({
    debug: () => {},
    info: () => {},
    warn: (message) => logger.warn({ source: 'strands' }, String(message)),
    error: (message) => logger.error({ source: 'strands' }, String(message))
  })

  strandsLoggingConfigured = true
}

/**
 * @param {MemoExtractionConfig} cfg
 */
const buildProviderModel = async (cfg) => {
  const params = cfg.effort ? { output_config: { effort: cfg.effort } } : {}

  if (cfg.provider === 'bedrock') {
    const { BedrockModel } = await import('@strands-agents/sdk/models/bedrock')

    return new BedrockModel({
      modelId: cfg.modelId,
      maxTokens: cfg.maxTokens,
      region: config.get('aws').region,
      additionalRequestFields: params
    })
  }

  const { AnthropicModel } =
    await import('@strands-agents/sdk/models/anthropic')

  return new AnthropicModel({
    modelId: cfg.modelId,
    maxTokens: cfg.maxTokens,
    apiKey: cfg.anthropicApiKey ?? undefined,
    params,
    clientConfig: {
      fetch: proxyFetch,
      // The extraction deadline is enforced by the caller's AbortSignal; one
      // SDK retry covers a transient 429/5xx inside it.
      maxRetries: 1
    }
  })
}

/**
 * @param {MemoExtractionConfig} [cfg]
 * @returns {MemoModel}
 */
export const createStrandsModel = (cfg = getMemoExtractionConfig()) => ({
  async extract(memo, { signal }) {
    const strands = await import('@strands-agents/sdk')

    configureStrandsLogging(strands)

    // A new agent per memo: an Agent keeps its conversation, and one memo must
    // never see another.
    const agent = new strands.Agent({
      model: await buildProviderModel(cfg),
      systemPrompt: SYSTEM_PROMPT,
      structuredOutputSchema: ModelOutputSchema,
      printer: false
    })

    let result

    try {
      result = await agent.invoke(buildUserMessage(memo), {
        cancelSignal: signal
      })
    } catch (error) {
      if (signal.aborted) {
        throw new MemoModelError('TIMEOUT', { cause: error })
      }

      if (error instanceof strands.StructuredOutputError) {
        throw new MemoModelError('INVALID_OUTPUT', { cause: error })
      }

      throw new MemoModelError('MODEL_ERROR', { cause: error })
    }

    if (result.stopReason === 'cancelled') {
      throw new MemoModelError('TIMEOUT')
    }

    const parsed = ModelOutputSchema.safeParse(result.structuredOutput)

    if (!parsed.success) {
      throw new MemoModelError('INVALID_OUTPUT')
    }

    const usage = result.metrics?.accumulatedUsage

    return {
      output: parsed.data,
      usage: usage
        ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }
        : null
    }
  }
})
