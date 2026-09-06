import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
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

export const geminiProvider: AIProvider = {
  async testConnection(apiKey, model): Promise<AIConnectionTestResult> {
    try {
      const client = new GoogleGenAI({ apiKey });
      await client.models.get({ model });
      return { ok: true, message: `Connected — "${model}" is available.` };
    } catch (error) {
      const message = toSafeProviderErrorMessage(error);
      return { ok: false, message };
    }
  },

  async generateProposal(apiKey, model, input: ProposalPromptInput): Promise<AIGenerateProposalResult> {
    const client = new GoogleGenAI({ apiKey });
    const prompt = buildProposalPrompt(input);

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(proposalContentSchema),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model did not return any output.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("The model's output was not valid JSON.");
    }

    const parsed = proposalContentSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("The model's output did not match the expected proposal format.");
    }

    return {
      data: parsed.data,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  },

  async reviseProposal(apiKey, model, input: ProposalRevisionPromptInput): Promise<AIReviseProposalResult> {
    const client = new GoogleGenAI({ apiKey });
    const prompt = buildProposalRevisionPrompt(input);

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(proposalRevisionSchema),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model did not return any output.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("The model's output was not valid JSON.");
    }

    const parsed = proposalRevisionSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("The model's output did not match the expected revision format.");
    }

    return {
      data: parsed.data,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  },

  async suggestNegotiation(apiKey, model, input: NegotiationPromptInput): Promise<AISuggestNegotiationResult> {
    const client = new GoogleGenAI({ apiKey });
    const prompt = buildNegotiationPrompt(input);

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(negotiationSuggestionSchema),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model did not return any output.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("The model's output was not valid JSON.");
    }

    const parsed = negotiationSuggestionSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("The model's output did not match the expected suggestion format.");
    }

    return {
      data: parsed.data,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  },

  async generateFollowUp(apiKey, model, input: FollowUpPromptInput): Promise<AIGenerateFollowUpResult> {
    const client = new GoogleGenAI({ apiKey });
    const prompt = buildFollowUpPrompt(input);

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(followUpMessageSchema),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model did not return any output.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("The model's output was not valid JSON.");
    }

    const parsed = followUpMessageSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("The model's output did not match the expected message format.");
    }

    return {
      data: parsed.data,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  },

  async paraphraseRequirement(
    apiKey,
    model,
    input: ParaphraseRequirementPromptInput
  ): Promise<AIParaphraseRequirementResult> {
    const client = new GoogleGenAI({ apiKey });
    const prompt = buildParaphraseRequirementPrompt(input);

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(paraphraseRequirementSchema),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The model did not return any output.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("The model's output was not valid JSON.");
    }

    const parsed = paraphraseRequirementSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("The model's output did not match the expected requirement format.");
    }

    return {
      data: parsed.data,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  },
};
