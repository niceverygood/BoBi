export type ReferralStatus = 'signed_up' | 'first_paid' | 'rewarded' | 'capped' | 'voided';

export interface ReferralCode {
    code: string;
    user_id: string;
    created_at: string;
}

export interface Referral {
    id: string;
    inviter_id: string;
    invitee_id: string | null;
    code: string;
    status: ReferralStatus;
    signed_up_at: string;
    first_paid_at: string | null;
    rewarded_at: string | null;
    voided_at: string | null;
    void_reason: string | null;
    created_at: string;
}

export interface ProGrant {
    id: string;
    user_id: string;
    source: 'referral' | 'admin' | 'promo';
    source_ref_id: string | null;
    granted_at: string;
    expires_at: string;
    revoked_at: string | null;
    revoke_reason: string | null;
    created_at: string;
}

export interface ReferralStatusSummary {
    code: string;
    totalInvited: number;
    totalSignedUp: number;
    totalPaid: number;
    totalRewarded: number;
    rewardedThisMonth: number;
    monthlyLimit: number;
    activeProGrantExpiresAt: string | null;
    referrals: Array<{
        id: string;
        inviteeMaskedName: string | null;
        status: ReferralStatus;
        signedUpAt: string;
        firstPaidAt: string | null;
        rewardedAt: string | null;
    }>;
}

export const REFERRAL_MONTHLY_LIMIT = 3;
export const REFERRAL_PRO_GRANT_DAYS = 30;
