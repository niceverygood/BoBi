// lib/ai/parser.ts

/**
 * Parse AI response that should be JSON.
 * Handles cases where the response might be wrapped in markdown code blocks.
 */
export function parseAIResponse<T>(response: string): T {
    let cleaned = response.trim();

    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned) as T;
    } catch (error) {
        // Try to extract JSON from the response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]) as T;
            } catch {
                // Fall through to repair
            }
        }

        // Try to repair truncated JSON (common when max_tokens is hit)
        try {
            const repaired = repairTruncatedJSON(cleaned);
            return JSON.parse(repaired) as T;
        } catch {
            // Fall through to error
        }

        throw new Error(`Failed to parse AI response as JSON: ${(error as Error).message}\nResponse: ${cleaned.substring(0, 200)}...`);
    }
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces/strings
 */
function repairTruncatedJSON(json: string): string {
    let s = json.trim();

    // Ensure it starts with {
    const firstBrace = s.indexOf('{');
    if (firstBrace === -1) throw new Error('No JSON object found');
    s = s.substring(firstBrace);

    // Remove trailing comma if present
    s = s.replace(/,\s*$/, '');

    // Track open brackets
    let inString = false;
    let escaped = false;
    const stack: string[] = [];

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (ch === '\\') {
            escaped = true;
            continue;
        }

        if (ch === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (ch === '{') stack.push('}');
        else if (ch === '[') stack.push(']');
        else if (ch === '}' || ch === ']') stack.pop();
    }

    // If still in a string, close it
    if (inString) {
        s += '"';
    }

    // Remove trailing comma after closing string
    s = s.replace(/,\s*$/, '');

    // Close all open brackets/braces
    while (stack.length > 0) {
        const closer = stack.pop();
        // Remove trailing comma before closing
        s = s.replace(/,\s*$/, '');
        s += closer;
    }

    return s;
}

/**
 * Validate that the parsed result has the expected structure
 */
export function validateAnalysisResult(result: Record<string, unknown>): boolean {
    return (
        typeof result.analysisDate === 'string' &&
        Array.isArray(result.items) &&
        Array.isArray(result.riskFlags) &&
        typeof result.overallSummary === 'string'
    );
}

export function validateProductResult(result: Record<string, unknown>): boolean {
    return (
        Array.isArray(result.products) &&
        typeof result.bestOption === 'string' &&
        typeof result.tips === 'string'
    );
}

export function validateClaimResult(result: Record<string, unknown>): boolean {
    return (
        Array.isArray(result.claimableItems) &&
        typeof result.claimSummary === 'object' &&
        typeof result.summary === 'string' &&
        Array.isArray(result.importantNotes)
    );
}
