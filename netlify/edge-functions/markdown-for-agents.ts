/**
 * Edge Function: Markdown for AI Agents
 *
 * Serves Markdown instead of HTML when AI agents request it via
 * `Accept: text/markdown`, reducing token usage by ~80%.
 *
 * ## Testing
 *
 *   curl -H "Accept: text/markdown" https://your-site.netlify.app/
 *   curl -H "Accept: text/markdown" https://your-site.netlify.app/app
 *
 * ## Local testing
 *
 *   netlify dev
 *   curl -H "Accept: text/markdown" http://localhost:8888/
 *
 * ## Adding or removing paths
 *
 * Edit the `path` array in the `config` export at the bottom of this file
 * to add new content routes. Add paths to `excludedPath` to skip them.
 * Paths use URLPattern syntax (e.g. "/blog/*" matches all blog sub-paths).
 */

import type { Config, Context } from "@netlify/edge-functions";
// @ts-ignore — esm.sh CDN import for Deno compatibility in edge functions
import TurndownService from "https://esm.sh/turndown@7.2.0";

export default async (req: Request, context: Context) => {
  const accept = req.headers.get("accept") || "";

  // Only intercept requests that explicitly ask for Markdown
  if (!accept.includes("text/markdown")) {
    return;
  }

  try {
    const response = await context.next();

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    const html = await response.text();

    // Strip non-content elements before conversion
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    // Remove images, forms, buttons, and inputs from output
    turndown.remove(["img", "form", "button", "input", "svg", "canvas"]);

    const markdown = turndown.turndown(cleaned).trim();
    const estimatedTokens = Math.ceil(markdown.length / 4);

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Markdown-Tokens": String(estimatedTokens),
        "Content-Signal": "ai-train=yes, search=yes, ai-input=yes",
      },
    });
  } catch {
    // On any error, fall back to the original HTML response
    return context.next();
  }
};

export const config: Config = {
  // Content pages identified in this project.
  // Add new content paths here; use URLPattern syntax (e.g. "/blog/*").
  path: ["/", "/app"],

  // Excluded paths — API routes, assets, and framework internals are
  // already outside the path list above. Add more here if needed.
  excludedPath: ["/api/*", "/_next/*"],

  // If the function errors, serve the original HTML page instead
  onError: "bypass",
};
