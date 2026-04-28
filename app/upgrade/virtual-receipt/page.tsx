import {
    Receipt,
    AlertTriangle,
    Calculator,
    Hospital,
    FileSearch,
    TrendingDown,
} from 'lucide-react';
import { ReceiptPreviewCard } from '@/components/landing/ReportPreviewGallery';
import FeatureUpgradeLayout, { type ValueBullet, type StatItem } from '@/components/upgrade/FeatureUpgradeLayout';

const VALUE_BULLETS: ValueBullet[] = [
    { icon: Hospital, text: '폐암·위암·심근경색 등 50+ 질환 시나리오별 실제 진료비 추정', highlight: '50+ 질환' },
    { icon: Calculator, text: '총 진료비 − 건강보험 적용 − 설계 보험금 − 생활비 자동 계산' },
    { icon: TrendingDown, text: '"이 질환 걸리면 OOO만원 부족합니다"를 숫자로 제시', highlight: '숫자로' },
    { icon: FileSearch, text: '국립암센터·건강보험심사평가원 공식 통계 기반' },
    { icon: AlertTriangle, text: '보장 공백을 시각화해 고객의 가입 결정을 앞당깁니다' },
];

const STATS: [StatItem, StatItem, StatItem] = [
    { value: '50', unit: '+ 질환', label: '질환별 진료비 DB' },
    { value: '2024', unit: '년 기준', label: '국립암센터 통계' },
    { value: '12', unit: '개월', label: '평균 투병기간' },
];

export default function VirtualReceiptUpgradePage() {
    return (
        <FeatureUpgradeLayout
            badgeText="Pro 플랜 전용 기능"
            BadgeIcon={Receipt}
            title={
                <>
                    "보장 공백"을 <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">영수증</span>으로 보여주세요
                </>
            }
            subtitle={<>공식 진료비 통계 기반으로 질환별 총 진료비·건강보험 적용·자기부담·설계 보험금을 회계 영수증 형태로 한눈에 정리합니다</>}
            previewCard={<ReceiptPreviewCard />}
            previewCaption="폐암 진단 시나리오: 총 진료비 3,500만원, 건강보험 적용 후 자기부담 700만원, 생활비 포함 −500만원 부족액 표시 샘플입니다."
            valueBullets={VALUE_BULLETS}
            planTier="pro"
            stats={STATS}
            testimonialsSubcopy='가상 영수증으로 고객 설득에 성공한 설계사들의 이야기'
            finalCtaTitle="숫자가 세일즈를 바꿉니다"
            finalCtaSubcopy="Pro 플랜으로 업그레이드하면 오늘 바로 모든 상담에 가상 영수증을 활용할 수 있습니다"
        />
    );
}
