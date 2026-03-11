// types/insurance.ts

export interface DisclosureRule {
    ruleId: string;
    question: string;
    periodMonths: number;
    conditions: string[];
    targetDiseases?: string[];
    targetMedications?: string[];
}

export interface DisclosureRuleSet {
    rules: DisclosureRule[];
}

export interface InsuranceProduct {
    id: string;
    company: string;
    product_name: string;
    product_type: 'simple' | 'mild' | 'standard';
    disclosure_rules: DisclosureRuleSet;
    is_active: boolean;
    created_at: string;
}

export interface CoverageCondition {
    type: string;
    description: string;
    deductible?: number;
    maxAmount?: number;
}

export interface InsuranceClause {
    id: string;
    product_id: string;
    clause_type: string;
    clause_text: string;
    coverage_conditions: CoverageCondition[];
    exclusions: string[];
    created_at: string;
}
