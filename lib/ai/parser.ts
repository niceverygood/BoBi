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
 * Attempt to repair truncated JSON by closing open brackets/braces/strings.
 * Improved version that handles mid-string truncation (e.g., max_tokens cutoff).
 *
 * Strategy:
 * 1. Find the last valid JSON point (balanced brackets up to that point)
 * 2. Cut everything after it
 * 3. Close remaining open brackets
 */
function repairTruncatedJSON(json: string): string {
    let s = json.trim();

    // Ensure it starts with {
    const firstBrace = s.indexOf('{');
    if (firstBrace === -1) throw new Error('No JSON object found');
    s = s.substring(firstBrace);

    // Walk the string, tracking the last position where brackets were balanced
    // at depth >= 1 (i.e., a position where we could safely cut and close)
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    let lastSafeIdx = -1; // position of last complete value
    let lastStackLenAtSafe = 0;

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
            // When a string closes, it's a safe point
            if (!inString && stack.length > 0) {
                lastSafeIdx = i;
                lastStackLenAtSafe = stack.length;
            }
            continue;
        }

        if (inString) continue;

        if (ch === '{' || ch === '[') {
            stack.push(ch === '{' ? '}' : ']');
        } else if (ch === '}' || ch === ']') {
            stack.pop();
            // After closing a bracket, it's a safe point
            if (stack.length > 0) {
                lastSafeIdx = i;
                lastStackLenAtSafe = stack.length;
            }
        } else if (ch === ',' && stack.length > 0) {
            // Comma at depth >= 1 marks end of a value
            lastSafeIdx = i - 1;
            lastStackLenAtSafe = stack.length;
        }
    }

    // If parsing completed with balanced stack, nothing to repair
    if (stack.length === 0 && !inString) {
        return s;
    }

    // Truncation happened. Cut to lastSafeIdx if available.
    let result: string;
    let openCount: number;
    if (lastSafeIdx >= 0) {
        result = s.substring(0, lastSafeIdx + 1);
        openCount = lastStackLenAtSafe;
    } else {
        // No safe point found — fallback to current state
        result = s;
        if (inString) result += '"';
        openCount = stack.length;
    }

    // Remove trailing comma
    result = result.replace(/,\s*$/, '');

    // Close all remaining open brackets (reverse order)
    // We need to reconstruct the closing order from the original stack
    // Since lastSafeIdx tracks brackets still open, we re-walk
    const needClose: string[] = [];
    {
        let inStr = false, esc = false;
        const st: string[] = [];
        for (let i = 0; i < result.length; i++) {
            const ch = result[i];
            if (esc) { esc = false; continue; }
            if (ch === '\\') { esc = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === '{') st.push('}');
            else if (ch === '[') st.push(']');
            else if (ch === '}' || ch === ']') st.pop();
        }
        // If still in string, close it
        if (inStr) {
            result += '"';
        }
        // Remove trailing comma again
        result = result.replace(/,\s*$/, '');
        // Collect remaining closers
        while (st.length > 0) {
            needClose.push(st.pop()!);
        }
    }

    for (const closer of needClose) {
        result = result.replace(/,\s*$/, '');
        result += closer;
    }

    return result;
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
