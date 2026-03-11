// types/database.ts

export interface Profile {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    plan: 'basic' | 'pro' | 'enterprise';
    analysis_count: number;
    created_at: string;
    updated_at: string;
}

export interface Customer {
    id: string;
    user_id: string;
    name: string;
    birth_date: string | null;
    gender: 'male' | 'female' | null;
    phone: string | null;
    memo: string | null;
    created_at: string;
}

export interface Upload {
    id: string;
    user_id: string;
    customer_id: string | null;
    file_name: string;
    file_path: string;
    file_type: 'basic_info' | 'prescription' | 'detail_treatment';
    raw_text: string | null;
    created_at: string;
}

export interface Analysis {
    id: string;
    user_id: string;
    customer_id: string | null;
    upload_ids: string[];
    status: 'pending' | 'processing' | 'completed' | 'error';
    medical_history: Record<string, unknown> | null;
    disclosure_summary: Record<string, unknown> | null;
    product_eligibility: Record<string, unknown> | null;
    claim_assessment: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    // joined fields
    customer?: Customer;
}

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at' | 'updated_at' | 'analysis_count'>;
                Update: Partial<Profile>;
            };
            customers: {
                Row: Customer;
                Insert: Omit<Customer, 'id' | 'created_at'>;
                Update: Partial<Customer>;
            };
            uploads: {
                Row: Upload;
                Insert: Omit<Upload, 'id' | 'created_at'>;
                Update: Partial<Upload>;
            };
            analyses: {
                Row: Analysis;
                Insert: Omit<Analysis, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Analysis>;
            };
        };
    };
}
