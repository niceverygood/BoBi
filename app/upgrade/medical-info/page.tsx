import {
    Stethoscope,
    CheckCircle2,
    FileText,
    Zap,
    Database,
    ShieldCheck,
} from 'lucide-react';
import { DisclosurePreviewCard } from '@/components/landing/ReportPreviewGallery';
import FeatureUpgradeLayout, { type ValueBullet, type StatItem } from '@/components/upgrade/FeatureUpgradeLayout';

const VALUE_BULLETS: ValueBullet[] = [
    { icon: Zap, text: '고객 간편인증 5초 → 5년치 진료이력 자동 로딩', highlight: '5초' },
    { icon: FileText, text: '14,283개 KCD 질병코드로 고지사항 자동 판정', highlight: '14,283개' },
    { icon: Database, text: '심평원 + 공단 검진 + 자동차보험 통합 조회' },
    { icon: ShieldCheck, text: '통원 7회 이상 질환·상시 복용약 자동 검출' },
    { icon: CheckCircle2, text: '분석 결과를 PDF·카카오 알림톡으로 고객 직송' },
];

const STATS: [StatItem, StatItem, StatItem] = [
    { value: '14,283', unit: '개', label: 'KCD 질병코드' },
    { value: '1', unit: '분 이내', label: '자동 조회 완료' },
    { value: '3', unit: '일', label: '무료 체험' },
];

export default function MedicalInfoUpgradePage() {
    return (
        <FeatureUpgradeLayout
            badgeText="베이직 플랜부터 이용 가능"
            BadgeIcon={Stethoscope}
            title={
                <>
                    고객 진료정보를 <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">1분 만에</span><br className="hidden sm:block" />
                    <span className="sm:hidden"> </span>자동 조회합니다
                </>
            }
            subtitle={<>심평원 진료이력 · 공단 검진 · 자동차보험까지 한 번에 통합 분석해 고지사항 누락으로 인한 수수료 환수 리스크를 원천 차단합니다</>}
            previewCard={<DisclosurePreviewCard />}
            previewCaption='고객 진료이력을 분석해 고지사항 질문별 "예/아니오"를 자동 판정하고, 검출된 질환을 KCD 코드로 분류한 샘플입니다.'
            valueBullets={VALUE_BULLETS}
            planTier="basic"
            stats={STATS}
            testimonialsSubcopy="통원 7회 누락으로 고민하던 설계사들의 이야기"
            finalCtaTitle="지금 고객 상담이 있으세요?"
            finalCtaSubcopy="3일 무료 체험을 시작하면 오늘 바로 진료정보 조회부터 모든 기능을 쓸 수 있습니다"
        />
    );
}
