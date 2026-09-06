export type ProposalPromptInput = {
  leadName: string;
  company?: string | null;
  industry?: string | null;
  expectedTimeline?: string | null;
  approvedRequirements: { category: string; requirement: string; confidence: string }[];
};

// Only approved requirements and basic client fields go into this prompt —
// never the raw transcript or original inquiry — per the product's
// minimal-context principle. Every requirement passed in has already been
// explicitly approved by the agency (no further status filtering needed
// here) — `confidence` still tells the model how certain the original
// extraction was, so it can lean more cautiously on low-confidence items.
export function buildProposalPrompt(input: ProposalPromptInput): string {
  return `You are drafting a software project proposal for a client, based on requirements a software agency has already reviewed and approved.

Use ONLY the approved requirements and client details provided below. Do not invent scope, features, or specific vendor/technology names unless they are stated in the requirements below. When suggesting a technology stack, prefer general descriptions (e.g. "a modern web framework", "a managed cloud database") over specific brand names, unless a specific technology is explicitly named in the requirements.

Do not include specific prices, discounts, or payment amounts anywhere in your output — pricing is handled separately in a quotation document. Keep payment terms as general policy language (e.g. "milestone-based payments as detailed in the accompanying quotation"), never a number.

Requirements marked with LOW confidence were less certain extractions — word them a little more cautiously in your narrative than HIGH-confidence ones, but every requirement listed here has already been approved by the agency and belongs in the proposal.

<client_context>
Client: ${input.leadName}${input.company ? ` (${input.company})` : ""}
Industry: ${input.industry || "(not specified)"}
Expected timeline: ${input.expectedTimeline || "(not specified)"}
</client_context>

<approved_requirements>
${
  input.approvedRequirements.length > 0
    ? input.approvedRequirements
        .map((r) => `- [${r.category}] (${r.confidence} confidence) ${r.requirement}`)
        .join("\n")
    : "(none)"
}
</approved_requirements>`;
}

export type ProposalRevisionPromptInput = {
  leadName: string;
  company?: string | null;
  industry?: string | null;
  expectedTimeline?: string | null;
  currentRequirements: { id: string; category: string; requirement: string; confidence: string }[];
  existingProposal: {
    coverTitle: string;
    executiveSummary: string;
    businessUnderstanding: string;
    proposedSolution: string;
    scopeOfWork: string[];
    deliverables: string[];
    technologyStack: string[];
    timeline: string;
    assumptions: string[];
    outOfScope: string[];
    supportWarranty: string;
    paymentTerms: string;
    nextSteps: string[];
  };
  userInstruction: string;
};

// Revising a REJECTED proposal — the model must decide whether the request
// changes scope (touches Requirements) or is purely about the document's
// wording/structure, then produce the full revised proposal either way.
// Requirement ids are given so removals can reference an exact row — the
// model must never invent an id, and the server re-validates every id it
// returns against the real project before anything is written.
export function buildProposalRevisionPrompt(input: ProposalRevisionPromptInput): string {
  return `You are revising a software project proposal that the client rejected, based on the agency's instructions for what to change.

First, decide whether the requested change affects SCOPE (adding, removing, or substantially altering a requirement) or is ONLY about the proposal document's wording, tone, structure, or formatting, with nothing about what's being built actually changing. Set isScopeChange accordingly — when in doubt, prefer false and only mark true when the instruction clearly asks to add/remove/change what's being built.

If it IS a scope change:
- List the exact requirement ids (copied verbatim from <current_requirements> below) to remove — only ones the instruction actually asks to remove or replace. Never invent an id, and never list one not shown below.
- List any brand-new requirements to add, each with a category, clear requirement text, and priority.
- Do not remove or add anything beyond what the instruction implies.

If it is NOT a scope change, leave both lists empty — do not touch Requirements for a wording-only request.

Either way, produce the full revised proposal content. Use ONLY the requirements that will apply once your removals/additions are applied to the current list below — never invent scope beyond that, no specific technology brand names unless already named in the requirements, and no prices, discounts, or payment amounts (pricing lives in a separate quotation document; keep payment terms as general policy language).

<client_context>
Client: ${input.leadName}${input.company ? ` (${input.company})` : ""}
Industry: ${input.industry || "(not specified)"}
Expected timeline: ${input.expectedTimeline || "(not specified)"}
</client_context>

<current_requirements>
${
  input.currentRequirements.length > 0
    ? input.currentRequirements
        .map((r) => `- id: ${r.id} [${r.category}] (${r.confidence} confidence) ${r.requirement}`)
        .join("\n")
    : "(none)"
}
</current_requirements>

<existing_proposal>
Cover title: ${input.existingProposal.coverTitle}
Executive summary: ${input.existingProposal.executiveSummary}
Business understanding: ${input.existingProposal.businessUnderstanding}
Proposed solution: ${input.existingProposal.proposedSolution}
Scope of work: ${input.existingProposal.scopeOfWork.join("; ") || "(none)"}
Deliverables: ${input.existingProposal.deliverables.join("; ") || "(none)"}
Technology stack: ${input.existingProposal.technologyStack.join("; ") || "(none)"}
Timeline: ${input.existingProposal.timeline}
Assumptions: ${input.existingProposal.assumptions.join("; ") || "(none)"}
Out of scope: ${input.existingProposal.outOfScope.join("; ") || "(none)"}
Support & warranty: ${input.existingProposal.supportWarranty}
Payment terms: ${input.existingProposal.paymentTerms}
Next steps: ${input.existingProposal.nextSteps.join("; ") || "(none)"}
</existing_proposal>

<agency_instruction>
${input.userInstruction}
</agency_instruction>`;
}

export type NegotiationPromptInput = {
  leadName: string;
  targetBudget?: number | null;
  currentTotal: number;
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

// The model only ever names which EXISTING line item to change and a reason —
// it never proposes a number. The actual currency impact is computed in app
// code by matching its suggestions back to the real quotation items.
export function buildNegotiationPrompt(input: NegotiationPromptInput): string {
  return `You are helping a software agency respond to a client who wants a lower price on a project quotation.

${
  input.targetBudget
    ? `The client's target budget is approximately ${input.targetBudget}; the current quotation total is ${input.currentTotal}.`
    : `The client has asked for a lower price; the current quotation total is ${input.currentTotal}.`
}

Suggest which EXISTING line items below could be removed, reduced in quantity, or deferred to a later phase to help close the gap — reference each by its exact description as given. Do not invent new line items, and do not state specific new prices, discounts, or savings amounts — the agency will compute the actual numbers themselves once they decide which suggestions to apply.

<quotation_items>
${input.items
  .map((i) => `- "${i.description}" (qty ${i.quantity}, unit price ${i.unitPrice}, line total ${i.lineTotal})`)
  .join("\n")}
</quotation_items>

Client: ${input.leadName}`;
}

export type FollowUpPromptInput = {
  leadName: string;
  proposalTitle: string;
  daysSinceSent?: number | null;
  hasBeenViewed: boolean;
};

// Deliberately light on context — just the lead name, proposal title, and a
// couple of status facts. Never the full proposal or transcript.
export function buildFollowUpPrompt(input: FollowUpPromptInput): string {
  return `Draft a brief, friendly follow-up message from a software agency to a client about a proposal that was already sent to them.

Keep it short (3-5 sentences), warm, and low-pressure — just checking in, offering to answer questions or discuss changes. Do not invent specific proposal details, prices, or promises beyond what's given below. Do not sign off with a specific person's name or company name — leave that for the agency to add.

Client name: ${input.leadName}
Proposal: ${input.proposalTitle}
${input.daysSinceSent != null ? `Days since the proposal was sent: ${input.daysSinceSent}\n` : ""}${
    input.hasBeenViewed
      ? "The client has opened and viewed the proposal."
      : "The client has not opened the proposal yet, as far as we can tell."
  }`;
}

export type ParaphraseRequirementPromptInput = {
  requirement: string;
};

// Deliberately narrow — a wording cleanup, not an extraction step. Must
// return exactly one requirement, never split the input into several.
export function buildParaphraseRequirementPrompt(input: ParaphraseRequirementPromptInput): string {
  return `Rewrite the following client requirement as a single clear, concise, professional requirement statement. Preserve its exact meaning and scope — do not add, remove, or assume anything not stated, and do not split it into multiple requirements.

Original requirement:
"""
${input.requirement}
"""`;
}
