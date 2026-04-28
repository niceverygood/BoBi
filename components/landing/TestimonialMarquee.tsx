import { Star, Quote } from 'lucide-react';

type Testimonial = {
    quote: string;
    name: string;
    role: string;
    stat?: string;
    avatarGradient: string;
};

const TESTIMONIALS: Testimonial[] = [
    {
        quote: '고지사항 정리에 하루 2시간씩 쓰던 게 지금은 30초예요. 그 시간에 미팅을 한 건이라도 더 잡으니 월 수수료가 체감되게 올랐습니다.',
        name: '김○○ 설계사',
        role: 'GA 법인 · 8년차',
        stat: '월 수수료 +32%',
        avatarGradient: 'from-blue-500 to-indigo-600',
    },
    {
        quote: '통원 7회 이상 있는 걸 놓쳐서 수수료 환수당한 적이 있었어요. 보비 쓰고부터 자동으로 경고가 떠서 그런 실수가 완전히 없어졌습니다.',
        name: '박○○ 설계사',
        role: '생보사 전속 · 5년차',
        stat: '환수 클레임 0건',
        avatarGradient: 'from-rose-500 to-pink-600',
    },
    {
        quote: '"미래의 나" 보여드리면 고객이 먼저 "그래서 얼마짜리 들어야 돼요?"를 물어봅니다. 제가 설득할 필요 자체가 없어졌어요.',
        name: '이○○ 설계사',
        role: 'GA · 3년차',
        stat: '체결률 +41%',
        avatarGradient: 'from-emerald-500 to-teal-600',
    },
    {
        quote: '가상 영수증으로 "폐암 걸리면 500만원 부족"을 숫자로 보여드리니까 고객이 망설이지 않습니다. 이만한 세일즈 도구가 없어요.',
        name: '최○○ 설계사',
        role: '손보사 · 6년차',
        avatarGradient: 'from-violet-500 to-purple-600',
    },
    {
        quote: '팀원 6명 전원에게 붙였습니다. 신입도 베테랑처럼 상담 가능해지니까 지점 실적 편차가 눈에 띄게 줄었어요.',
        name: '정○○ 지점장',
        role: 'GA 법인 · 15년차',
        stat: '지점 실적 +28%',
        avatarGradient: 'from-amber-500 to-orange-600',
    },
    {
        quote: '1년차인데 고객이 먼저 지인을 소개해주시는 경우가 많아졌어요. 리포트 퀄리티가 제 명함이 됐습니다.',
        name: '강○○ 설계사',
        role: '생보사 · 신입 1년차',
        avatarGradient: 'from-cyan-500 to-blue-600',
    },
    {
        quote: '기존 고객 재접촉할 때 "보험금 청구 가능 항목" 리포트가 정말 먹힙니다. 리모델링 전환율이 두 배 됐어요.',
        name: '윤○○ 설계사',
        role: 'GA 법인대리점 · 10년차',
        stat: '리모델링 2x',
        avatarGradient: 'from-fuchsia-500 to-rose-600',
    },
    {
        quote: '심평원 PDF 업로드 → 카카오 리포트 전송까지 1분. 고객이 "이 정도로 분석해주시는 분은 처음"이라고 하시더라고요.',
        name: '한○○ 설계사',
        role: '법인 · 7년차',
        avatarGradient: 'from-slate-600 to-slate-800',
    },
];

function TestimonialCard({ t }: { t: Testimonial }) {
    const initial = t.name.charAt(0);
    return (
        <div className="shrink-0 w-[280px] sm:w-[360px] p-5 sm:p-6 rounded-2xl border bg-card shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                </div>
                <Quote className="w-4 h-4 text-muted-foreground/40" />
            </div>

            <p className="text-sm sm:text-[15px] leading-relaxed text-foreground/90 mb-5 min-h-[5.5rem] sm:min-h-[6.5rem]">
                {t.quote}
            </p>

            <div className="flex items-center gap-3 pt-3 border-t">
                <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}
                >
                    {initial}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.role}</div>
                </div>
                {t.stat && (
                    <div className="shrink-0 text-right">
                        <div className="text-xs text-emerald-600 font-bold whitespace-nowrap">{t.stat}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TestimonialMarquee() {
    const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
    return (
        <div className="relative overflow-hidden">
            <div className="flex gap-4 sm:gap-6 animate-marquee w-max">
                {doubled.map((t, i) => (
                    <TestimonialCard key={i} t={t} />
                ))}
            </div>

            {/* 좌/우 페이드 마스크 */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent" />
        </div>
    );
}
