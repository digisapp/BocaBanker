/**
 * xAI model IDs used across the app — update here when xAI ships a new model.
 * Check what's available with: GET https://api.x.ai/v1/language-models
 *
 * grok-4.7 always reasons before answering; 'low' effort keeps chat replies
 * to a few seconds while still using the newest model.
 */
export const CHAT_MODEL = 'grok-4.7'
export const EMAIL_MODEL = 'grok-4.7'
export const REASONING_EFFORT = 'low' as const
