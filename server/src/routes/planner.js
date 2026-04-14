'use strict'

/**
 * Planner AI — /api/planner
 *
 * Given a set of summer-camp parameters, this endpoint builds an optimised
 * planning prompt and forwards it to Anthropic, then returns the AI-generated
 * schedule/recommendation.
 *
 * All requests must be authenticated (requireAuth).
 */

const { Router } = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const { requireAuth } = require('../middleware/auth')
const config = require('../config')

const router = Router()

let _client = null
function getClient() {
  if (!_client) {
    if (!config.anthropic.apiKey) return null
    _client = new Anthropic({ apiKey: config.anthropic.apiKey })
  }
  return _client
}

/**
 * Build a structured prompt for the Planner AI.
 *
 * @param {object} params
 * @param {number} params.hoursOutPerDay    - Min hours kids should be out of the house per day
 * @param {number} params.totalBudget       - Total budget in USD for the summer
 * @param {number} params.maxCommuteMinutes - Max acceptable one-way commute in minutes
 * @param {Array}  params.camps             - Array of available camp objects
 * @param {string} params.startDate         - Summer start date (YYYY-MM-DD)
 * @param {string} params.endDate           - Summer end date (YYYY-MM-DD)
 * @param {Array}  params.children          - Array of { name, ageYears } objects
 * @returns {string} The composed system + user prompt pair
 */
function buildPlannerPrompt(params) {
  const {
    hoursOutPerDay = 6,
    totalBudget = 0,
    maxCommuteMinutes = 30,
    camps = [],
    startDate,
    endDate,
    children = [],
  } = params

  const childrenDesc =
    children.length > 0
      ? children.map((c) => `${c.name} (age ${c.ageYears})`).join(', ')
      : 'the children'

  const campsDesc =
    camps.length > 0
      ? camps
          .map(
            (c, i) =>
              `${i + 1}. ${c.name} — $${c.costPerWeek}/week, ${c.hoursPerDay}h/day, ` +
              `${c.commuteMinutes} min commute, ages ${c.ageMin}–${c.ageMax}, ` +
              `available weeks: ${(c.availableWeeks || []).join(', ')}`
          )
          .join('\n')
      : 'No specific camps provided — suggest popular options.'

  const systemPrompt = `You are a helpful family planning assistant specialising in summer camp scheduling.
You prioritise:
1. Maximising the number of hours the kids are out of the house each day (target: ≥${hoursOutPerDay}h/day).
2. Keeping total camp costs within the family's budget ($${totalBudget || 'unspecified'} for the summer).
3. Ensuring one-way commute times never exceed ${maxCommuteMinutes} minutes.
Provide a week-by-week schedule in a clear, structured format.
If budget or commute constraints cannot be met simultaneously, explain the trade-offs and offer alternatives.`

  const userPrompt = `Please create an optimised summer camp schedule for ${childrenDesc}.

**Summer period:** ${startDate || 'June'} – ${endDate || 'August'}
**Target hours out of house:** at least ${hoursOutPerDay} hours per day
**Total budget:** $${totalBudget || 'flexible'}
**Max one-way commute:** ${maxCommuteMinutes} minutes

**Available camps:**
${campsDesc}

Provide a week-by-week schedule, show the total cost, and flag any weeks where coverage may be less than ${hoursOutPerDay} hours.`

  return { systemPrompt, userPrompt }
}

// ─── POST /api/planner/summer ─────────────────────────────────────────────────
// Body: {
//   hoursOutPerDay, totalBudget, maxCommuteMinutes,
//   camps, startDate, endDate, children
// }
router.post('/summer', requireAuth, async (req, res) => {
  const client = getClient()
  if (!client) {
    return res.status(503).json({
      error: 'AI is not configured. Set ANTHROPIC_API_KEY in the server environment variables.',
    })
  }

  const { systemPrompt, userPrompt } = buildPlannerPrompt(req.body || {})

  try {
    const response = await client.messages.create({
      model: config.anthropic.defaultModel,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content?.[0]?.text || ''

    return res.status(200).json({
      plan: text,
      usage: response.usage,
    })
  } catch (err) {
    const status = err.status || 500
    const message = err.message || 'Unknown Anthropic API error.'
    return res.status(status).json({ error: message })
  }
})

module.exports = router
