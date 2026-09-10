import { env } from '../../env.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface ClassificationResult {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  confidence: number;
  reasoning: string;
}

export async function classifyIncident(
  title: string,
  description: string,
  siteContext?: string
): Promise<ClassificationResult> {
  if (!env.GEMINI_API_KEY) {
    return { priority: 'MEDIUM', category: 'OTHER', confidence: 0, reasoning: 'AI not configured' };
  }

  const prompt = `You are an incident classifier for a property management platform. Classify the following incident:

Title: ${title}
Description: ${description}
${siteContext ? `Site context: ${siteContext}` : ''}

Respond in JSON format only:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "category": "PLUMBING" | "ELECTRICAL" | "STRUCTURAL" | "SECURITY" | "CLEANING" | "HVAC" | "ELEVATOR" | "FIRE_SAFETY" | "OTHER",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      })
    });

    if (!response.ok) {
      console.error('[AI] Gemini API error:', response.status);
      return { priority: 'MEDIUM', category: 'OTHER', confidence: 0, reasoning: 'API error' };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { priority: 'MEDIUM', category: 'OTHER', confidence: 0, reasoning: 'Invalid AI response' };

    const result = JSON.parse(jsonMatch[0]);
    return {
      priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(result.priority) ? result.priority : 'MEDIUM',
      category: result.category || 'OTHER',
      confidence: Math.min(1, Math.max(0, result.confidence || 0)),
      reasoning: result.reasoning || ''
    };
  } catch (err) {
    console.error('[AI] Classification failed:', err);
    return { priority: 'MEDIUM', category: 'OTHER', confidence: 0, reasoning: 'Classification failed' };
  }
}
