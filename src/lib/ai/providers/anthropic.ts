import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { toSafeProviderErrorMessage } from "@/lib/ai/errors";
import type {
  AIProvider,
  AIConnectionTestResult,
  AIGenerateProposalResult,
  AIReviseProposalResult,
  AISuggestNegotiationResult,
  AIGenerateFollowUpResult,
  AIParaphraseRequirementResult,
} from "@/lib/ai/provider";
import {
  buildProposalPrompt,
  buildProposalRevisionPrompt,
  buildNegotiationPrompt,
  buildFollowUpPrompt,
  buildParaphraseRequirementPrompt,
  type ProposalPromptInput,
  type ProposalRevisionPromptInput,
  type NegotiationPromptInput,
  type FollowUpPromptInput,
  type ParaphraseRequirementPromptInput,
} from "@/lib/ai/prompts";
import {
  proposalContentSchema,
  proposalRevisionSchema,
  negotiationSuggestionSchema,
  followUpMessageSchema,
  paraphraseRequirementSchema,
} from "@/lib/ai/schemas";

const MAX_TOKENS = 8192;

export const anthropicProvider: AIProvider = {
  async testConnection(apiKey, model): Promise<AIConnectionTestResult> {
    try {
      const client = new Anthropic({ apiKey });
      await client.models.retrieve(model);
      return { ok: true, message: `Connected — "${model}" is available.` };
    } catch (error) {
      const message = toSafeProviderErrorMessage(error);
      return { ok: false, message };
    }
  },

  async generateProposal(apiKey, model, input: ProposalPromptInput): Promise<AIGenerateProposalResult> {
    const client = new Anthropic({ apiKey });
    const prompt = buildProposalPrompt(input);

    const message = await client.messages.parse({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(proposalContentSchema) },
    });

    if (!message.parsed_output) {
      throw new Error("The model did not return a parseable proposal.");
    }

    return {
      data: message.parsed_output,
      usage: {
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
      },
    };
  },

  async reviseProposal(apiKey, model, input: ProposalRevisionPromptInput): Promise<AIReviseProposalResult> {
    const client = new Anthropic({ apiKey });
    const prompt = buildProposalRevisionPrompt(input);

    const message = await client.messages.parse({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(proposalRevisionSchema) },
    });

    if (!message.parsed_output) {
      throw new Error("The model did not return a parseable revision.");
    }

    return {
      data: message.parsed_output,
      usage: {
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
      },
    };
  },

  async suggestNegotiation(apiKey, model, input: NegotiationPromptInput): Promise<AISuggestNegotiationResult> {
    const client = new Anthropic({ apiKey });
    const prompt = buildNegotiationPrompt(input);

    const message = await client.messages.parse({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(negotiationSuggestionSchema) },
    });

    if (!message.parsed_output) {
      throw new Error("The model did not return a parseable suggestion.");
    }

    return {
      data: message.parsed_output,
      usage: {
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
      },
    };
  },

  async generateFollowUp(apiKey, model, input: FollowUpPromptInput): Promise<AIGenerateFollowUpResult> {
    const client = new Anthropic({ apiKey });
    const prompt = buildFollowUpPrompt(input);

    const message = await client.messages.parse({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(followUpMessageSchema) },
    });

    if (!message.parsed_output) {
      throw new Error("The model did not return a parseable message.");
    }

    return {
      data: message.parsed_output,
      usage: {
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
      },
    };
  },

  async paraphraseRequirement(
    apiKey,
    model,
    input: ParaphraseRequirementPromptInput
  ): Promise<AIParaphraseRequirementResult> {
    const client = new Anthropic({ apiKey });
    const prompt = buildParaphraseRequirementPrompt(input);

    const message = await client.messages.parse({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(paraphraseRequirementSchema) },
    });

    if (!message.parsed_output) {
      throw new Error("The model did not return a parseable requirement.");
    }

    return {
      data: message.parsed_output,
      usage: {
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
      },
    };
  },
};
