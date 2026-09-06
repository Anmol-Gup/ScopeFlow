import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
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

export const openAIProvider: AIProvider = {
  async testConnection(apiKey, model): Promise<AIConnectionTestResult> {
    try {
      const client = new OpenAI({ apiKey });
      await client.models.retrieve(model);
      return { ok: true, message: `Connected — "${model}" is available.` };
    } catch (error) {
      const message = toSafeProviderErrorMessage(error);
      return { ok: false, message };
    }
  },

  async generateProposal(apiKey, model, input: ProposalPromptInput): Promise<AIGenerateProposalResult> {
    const client = new OpenAI({ apiKey });
    const prompt = buildProposalPrompt(input);

    const completion = await client.chat.completions.parse({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(proposalContentSchema, "proposal_content"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("The model did not return a parseable proposal.");
    }

    return {
      data: parsed,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    };
  },

  async reviseProposal(apiKey, model, input: ProposalRevisionPromptInput): Promise<AIReviseProposalResult> {
    const client = new OpenAI({ apiKey });
    const prompt = buildProposalRevisionPrompt(input);

    const completion = await client.chat.completions.parse({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(proposalRevisionSchema, "proposal_revision"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("The model did not return a parseable revision.");
    }

    return {
      data: parsed,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    };
  },

  async suggestNegotiation(apiKey, model, input: NegotiationPromptInput): Promise<AISuggestNegotiationResult> {
    const client = new OpenAI({ apiKey });
    const prompt = buildNegotiationPrompt(input);

    const completion = await client.chat.completions.parse({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(negotiationSuggestionSchema, "negotiation_suggestion"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("The model did not return a parseable suggestion.");
    }

    return {
      data: parsed,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    };
  },

  async generateFollowUp(apiKey, model, input: FollowUpPromptInput): Promise<AIGenerateFollowUpResult> {
    const client = new OpenAI({ apiKey });
    const prompt = buildFollowUpPrompt(input);

    const completion = await client.chat.completions.parse({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(followUpMessageSchema, "followup_message"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("The model did not return a parseable message.");
    }

    return {
      data: parsed,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    };
  },

  async paraphraseRequirement(
    apiKey,
    model,
    input: ParaphraseRequirementPromptInput
  ): Promise<AIParaphraseRequirementResult> {
    const client = new OpenAI({ apiKey });
    const prompt = buildParaphraseRequirementPrompt(input);

    const completion = await client.chat.completions.parse({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(paraphraseRequirementSchema, "paraphrase_requirement"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("The model did not return a parseable requirement.");
    }

    return {
      data: parsed,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    };
  },
};
