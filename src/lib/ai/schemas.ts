import { z } from "zod";

// Functional requirements are never re-generated here — they're rendered
// straight from the approved RequirementVersion snapshot. This schema only
// covers the narrative sections the AI actually drafts.
export const proposalContentSchema = z.object({
  coverTitle: z.string(),
  executiveSummary: z.string(),
  businessUnderstanding: z.string(),
  proposedSolution: z.string(),
  scopeOfWork: z.array(z.string()),
  deliverables: z.array(z.string()),
  technologyStack: z.array(z.string()),
  timeline: z.string(),
  assumptions: z.array(z.string()),
  outOfScope: z.array(z.string()),
  supportWarranty: z.string(),
  paymentTerms: z.string(),
  nextSteps: z.array(z.string()),
});
export type ProposalContent = z.infer<typeof proposalContentSchema>;

// The AI only ever names which existing line item to change and why — actual
// currency impact is always computed by matching these against real
// QuotationItem rows in app code, never asserted by the model.
export const negotiationSuggestionSchema = z.object({
  summary: z.string(),
  suggestions: z.array(
    z.object({
      action: z.enum(["REMOVE", "REDUCE_QUANTITY", "DEFER_TO_PHASE_2", "OTHER"]),
      itemDescription: z.string(),
      suggestedQuantity: z.number().optional(),
      rationale: z.string(),
    })
  ),
});
export type NegotiationSuggestion = z.infer<typeof negotiationSuggestionSchema>;

export const followUpMessageSchema = z.object({
  message: z.string(),
});
export type FollowUpMessage = z.infer<typeof followUpMessageSchema>;

// Used only to preview a proposal revision before anything is persisted — the
// agency confirms this before any Requirement row or new ProposalVersion is
// created. `requirementsToRemove` only ever carries ids copied verbatim from
// the current-requirements list given in the prompt (never invented), which
// the server re-validates against real rows before applying anything.
export const proposalRevisionSchema = z.object({
  isScopeChange: z
    .boolean()
    .describe(
      "True if the requested change adds, removes, or materially changes what's being built. False if the request is only about wording, tone, structure, or formatting of the proposal document, with no effect on scope."
    ),
  summary: z
    .string()
    .describe("One or two plain-English sentences summarizing what changed, for the agency to review."),
  requirementsToRemove: z.array(
    z.object({
      id: z.string().describe("The exact id of an existing requirement to remove, copied from the input list."),
    })
  ),
  requirementsToAdd: z.array(
    z.object({
      category: z.enum(["FUNCTIONAL", "NON_FUNCTIONAL", "INTEGRATION", "CONSTRAINT"]),
      requirement: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    })
  ),
  revisedProposal: proposalContentSchema.describe(
    "The full revised proposal, reflecting the requested change and using only the requirements that apply after requirementsToRemove/requirementsToAdd are applied to the current requirement list."
  ),
});
export type ProposalRevisionResult = z.infer<typeof proposalRevisionSchema>;

export const paraphraseRequirementSchema = z.object({
  requirement: z
    .string()
    .describe(
      "The rewritten requirement: clear, concise, professional wording. Same meaning and scope as the input — never add, remove, or assume anything not stated."
    ),
});
export type ParaphraseRequirementResult = z.infer<typeof paraphraseRequirementSchema>;
