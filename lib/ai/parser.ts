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
                // Fall through to error
            }
        }

        throw new Error(`Failed to parse AI response as JSON: ${(error as Error).message}\nResponse: ${cleaned.substring(0, 200)}...`);
    }
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
        typeof result.totalClaimable === 'string' &&
        typeof result.summary === 'string'
    );
}
