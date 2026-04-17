// netlify/edge-functions/discover.js
export default async (req, context) => {
  const ANTHROPIC_API_KEY = Netlify.env.get("ANTHROPIC_API_KEY");

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({
      error: "ANTHROPIC_API_KEY not configured",
      events: []
    }), { status: 200, headers: { "content-type": "application/json" } });
  }

  const url = new URL(req.url);
  const horizon = url.searchParams.get("horizon") || "this weekend";
  const filter = url.searchParams.get("filter") || "family";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/Chicago"
  });

  const prompt = `You are helping the Brock family (Austin, TX, 78703) find events ${horizon}.
Today is ${today}.
Family: Bakari (37), Jenya (35), Monroe (5), Genevieve (3), Anastasia (5 months), Tanya (grandma, Russian speaker).

Use web search to find 8-12 REAL upcoming events in Austin from these sources in priority order:
1. do512.com
2. austin360.com and visitaustin.com
3. JCC Austin (shalomaustin.org), Westminster School, Thinkery (thinkeryaustin.org)
4. ticketmaster.com Austin events
5. Any other quality Austin family source

Filter focus: ${filter}

Return ONLY a valid JSON array (no markdown, no prose) with this exact shape:
[{
  "id": "unique-id",
  "title": "Event name",
  "date": "Sat Apr 18",
  "time": "10am-4pm",
  "location": "Venue name",
  "address": "Street address",
  "price": "Free" | "$15" | "$15/adult",
  "ageRange": "All ages" | "Kids 3-6" | "Toddler" | "Adults",
  "category": "outdoor" | "kids" | "music" | "food" | "arts" | "sports" | "datenight",
  "source": "do512" | "visitaustin" | "jcc" | "westminster" | "thinkery" | "ticketmaster" | "other",
  "url": "Direct link",
  "emoji": "🌳"
}]

Mix categories. Include options for the whole family AND 1-2 date-night options. Verify dates are in the future.`;

  try {
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ error: "Claude API error", events: [] }),
        { status: 200, headers: { "content-type": "application/json" } });
    }

    const textBlocks = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text).join("\n");
    let events = [];
    const jsonMatch = textBlocks.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { events = JSON.parse(jsonMatch[0]); } catch {}
    }

    return new Response(JSON.stringify({ events, updated: new Date().toISOString() }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=1800"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, events: [] }),
      { status: 200, headers: { "content-type": "application/json" } });
  }
};

export const config = { path: "/api/discover" };
