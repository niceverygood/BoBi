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
        '1year_hospitalization': '최근 1년 입원',
        '1year_surgery': '최근 1년 수술',
        '1year_visit': '최근 1년 7회이상통원',
        '2year_hospitalization': '최근 2년 입원',
        '2year_surgery': '최근 2년 수술',
        '2year_visit': '최근 2년 7회이상통원',
        '3year_hospitalization': '최근 3년 입원',
        '3year_surgery': '최근 3년 수술',
        '3year_visit': '최근 3년 7회이상통원',
        '4year_hospitalization': '최근 4년 입원',
        '4year_surgery': '최근 4년 수술',
        '4year_visit': '최근 4년 7회이상통원',
        '5year_hospitalization': '최근 5년 입원',
        '5year_surgery': '최근 5년 수술',
        '5year_visit': '최근 5년 7회이상통원',
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
