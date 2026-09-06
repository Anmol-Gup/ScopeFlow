import type {
  ProposalPromptInput,
  ProposalRevisionPromptInput,
  NegotiationPromptInput,
  FollowUpPromptInput,
  ParaphraseRequirementPromptInput,
} from "@/lib/ai/prompts";
import type {
  ProposalContent,
  ProposalRevisionResult,
  NegotiationSuggestion,
  FollowUpMessage,
  ParaphraseRequirementResult,
} from "@/lib/ai/schemas";

export type AIProviderName = "OPENAI" | "ANTHROPIC" | "GEMINI";

export interface AIConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface AIUsageTokens {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIGenerateProposalResult {
  data: ProposalContent;
  usage: AIUsageTokens;
}

export interface AIReviseProposalResult {
  data: ProposalRevisionResult;
  usage: AIUsageTokens;
}

export interface AISuggestNegotiationResult {
  data: NegotiationSuggestion;
  usage: AIUsageTokens;
}

export interface AIGenerateFollowUpResult {
  data: FollowUpMessage;
  usage: AIUsageTokens;
}

export interface AIParaphraseRequirementResult {
  data: ParaphraseRequirementResult;
  usage: AIUsageTokens;
}

// Every provider adapter implements this. Each operation here is only ever
// called from an explicit user action (never on page load / save / a timer),
// per the product's AI-cost-optimization principle.
export interface AIProvider {
  testConnection(apiKey: string, model: string): Promise<AIConnectionTestResult>;
  generateProposal(
    apiKey: string,
    model: string,
    input: ProposalPromptInput
  ): Promise<AIGenerateProposalResult>;
  reviseProposal(
    apiKey: string,
    model: string,
    input: ProposalRevisionPromptInput
  ): Promise<AIReviseProposalResult>;
  suggestNegotiation(
    apiKey: string,
    model: string,
    input: NegotiationPromptInput
  ): Promise<AISuggestNegotiationResult>;
  generateFollowUp(
    apiKey: string,
    model: string,
    input: FollowUpPromptInput
  ): Promise<AIGenerateFollowUpResult>;
  paraphraseRequirement(
    apiKey: string,
    model: string,
    input: ParaphraseRequirementPromptInput
  ): Promise<AIParaphraseRequirementResult>;
}
