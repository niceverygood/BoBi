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
 * Validate that the parsed result has the expected structure.
 * Fills in defaults for missing fields (common with repaired/truncated JSON).
 */
export function validateAnalysisResult(result: Record<string, unknown>): boolean {
    // Minimum requirement: must have items array
    if (!Array.isArray(result.items)) {
        return false;
    }

    // Fill in defaults for missing fields
    if (!result.analysisDate) {
        result.analysisDate = new Date().toISOString().split('T')[0];
    }
    if (!Array.isArray(result.riskFlags)) {
        result.riskFlags = [];
    }
    if (!result.overallSummary) {
        result.overallSummary = '분석이 완료되었습니다. 상세 내용을 확인해주세요.';
    }
    if (!Array.isArray(result.diseaseSummary)) {
        result.diseaseSummary = [];
    }

    return true;
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
