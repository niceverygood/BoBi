// lib/utils/format.ts
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(date: string | Date): string {
    return format(new Date(date), 'yyyy년 MM월 dd일', { locale: ko });
}

export function formatShortDate(date: string | Date): string {
    return format(new Date(date), 'yyyy-MM-dd');
}

export function formatRelativeTime(date: string | Date): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
    }).format(amount);
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('ko-KR').format(num);
}

export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        '3months_visit': '최근 3개월 통원',
        '3months_medication': '최근 3개월 투약',
        '1year_hospitalization': '최근 1년 입원/수술',
        '2year_hospitalization': '최근 2년 입원/수술',
        '5year_major_disease': '최근 5년 주요질병',
        'ongoing_medication': '상시 복용약',
    };
    return labels[category] || category;
}

export function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        basic_info: '기본진료정보',
        prescription: '처방조제정보',
        detail_treatment: '세부진료정보',
    };
    return labels[type] || type;
}
