import {
    Sparkles,
    TrendingUp,
    DollarSign,
    HeartPulse,
    Users,
    MessageCircle,
} from 'lucide-react';
import { FutureMePreviewCard } from '@/components/landing/ReportPreviewGallery';
import FeatureUpgradeLayout, { type ValueBullet, type StatItem } from '@/components/upgrade/FeatureUpgradeLayout';

const VALUE_BULLETS: ValueBullet[] = [
    { icon: TrendingUp, text: '암·뇌혈관·심혈관 5년 후 예상 병원비를 만원 단위로 정량화', highlight: '5년 후' },
    { icon: DollarSign, text: '지금 보완 vs 5년 후 가입 vs 아무것도 안 했을 때를 나란히 비교' },
    { icon: HeartPulse, text: 'NHIS 건강검진 수치 + 진료이력 자동 연동 기반 시나리오' },
    { icon: Users, text: "고객이 먼저 \"얼마짜리 들어야 돼요?\"라고 물어보게 만듭니다", highlight: '얼마짜리' },
    { icon: MessageCircle, text: '결과를 카카오 알림톡으로 공유 링크 전송 (7일 유효)' },
];

const STATS: [StatItem, StatItem, StatItem] = [
    { value: '3', unit: '가지 시나리오', label: '보완/지연/미보장' },
    { value: '50', unit: '+ 질환', label: '국립암센터 진료비 DB' },
    { value: '10', unit: '초', label: 'AI 시나리오 생성' },
];

export default function FutureMeUpgradePage() {
    return (
        <FeatureUpgradeLayout
            badgeText="Pro 플랜 전용 기능"
            BadgeIcon={Sparkles}
            title={
                <>
                    고객의 5년 후 미래를 <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">숫자로</span> 보여주세요
                </>
            }
            subtitle={<>"암 걸리면 큰일 나요" 대신 "2030년 예상 치료비 3,847만원, 보장 공백 1,200만원"을 구체적으로 제시해 계약 전환율을 끌어올립니다</>}
            previewCard={<FutureMePreviewCard />}
            previewCaption="암 진단 시 시나리오별 보장 금액·자기부담·미보장 비중을 비교한 샘플입니다."
            valueBullets={VALUE_BULLETS}
            planTier="pro"
            stats={STATS}
            testimonialsSubcopy='"미래의 나" 덕분에 체결률이 바뀐 설계사들의 이야기'
            finalCtaTitle="고객에게 '미래의 나'를 보여주세요"
            finalCtaSubcopy="Pro 플랜으로 업그레이드하면 오늘 바로 모든 고객에게 5년 시나리오 리포트를 보낼 수 있습니다"
        />
    );
}
