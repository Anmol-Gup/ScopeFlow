// Single source of truth for the marketing/SEO surface — reused by root
// metadata, robots.ts, sitemap.ts, and the landing page's JSON-LD so the
// site name/URL/description never drift out of sync across those files.

export const SITE_URL = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "ScopeFlow";
export const SITE_TITLE = "ScopeFlow — AI Proposal Software for Agencies";
export const SITE_DESCRIPTION =
  "Turn client requirements into professional proposals with AI. Manage revisions, client approvals, quotations, and projects in one workflow with ScopeFlow.";
