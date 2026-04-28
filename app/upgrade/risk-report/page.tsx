import {
    ShieldAlert,
    Stethoscope,
    BarChart3,
    Database,
    TrendingUp,
    Users,
} from 'lucide-react';
import { RiskReportPreviewCard } from '@/components/landing/ReportPreviewGallery';
import FeatureUpgradeLayout, { type ValueBullet, type StatItem } from '@/components/upgrade/FeatureUpgradeLayout';

const VALUE_BULLETS: ValueBullet[] = [
    { icon: BarChart3, text: '동일 연령 대비 상대 위험도(배수)를 질환별로 시각화', highlight: '배수' },
    { icon: Stethoscope, text: '대한고혈압학회·Framingham Heart Study 등 학회 가이드라인 근거' },
    { icon: Database, text: '14,283개 KCD 코드 + 고객 진료이력 자동 매핑', highlight: '14,283개' },
    { icon: TrendingUp, text: '암·뇌혈관·심혈관 카테고리별 고·중·저 위험도 자동 판정' },
    { icon: Users, text: '고객이 "내가 진짜 위험한 질환이 뭔지" 직관적으로 이해' },
];

const STATS: [StatItem, StatItem, StatItem] = [
    { value: '14,283', unit: '개', label: 'KCD 질병코드' },
    { value: 'A/B/C', unit: '', label: '학회 근거 수준' },
    { value: '10', unit: '년', label: 'NHIS 공식 예측' },
];

export default function RiskReportUpgradePage() {
    return (
        <FeatureUpgradeLayout
            badgeText="Pro 플랜 전용 기능"
            BadgeIcon={ShieldAlert}
            title={
                <>
                    질병 위험도를 <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">학회 근거</span>로 설명하세요
                </>
            }
            subtitle={<>진료이력과 건강검진 수치를 대한고혈압학회·Framingham 가이드라인과 매핑해, 고객 맞춤 위험 질환과 상대 위험도를 의학적 근거와 함께 제시합니다</>}
            previewCard={<RiskReportPreviewCard />}
            previewCaption="제2형 당뇨병 3.2배, 뇌졸중 2.4배 등 질환별 상대 위험도를 위험 레벨 배지와 함께 표시한 샘플입니다."
            valueBullets={VALUE_BULLETS}
            planTier="pro"
            stats={STATS}
            testimonialsSubcopy='질병 위험도 리포트로 전문성을 증명한 설계사들의 이야기'
            finalCtaTitle="설계사가 의사처럼 보이는 도구"
            finalCtaSubcopy="Pro 플랜으로 업그레이드하면 오늘 바로 모든 고객에게 학회 근거 기반 위험도 리포트를 제공할 수 있습니다"
        />
    );
}
