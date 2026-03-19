// app/api/coverage/parse-excel/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import type { Policy, Coverage } from '@/types/coverage';

export const maxDuration = 30;

/**
 * 엑셀 파일을 파싱하여 보험 데이터로 변환
 * 
 * 지원 형식:
 * 1) 시트별 보험 1건 (시트명 = "보험회사 - 상품명")
 *    | 보장명 | 보장금액 | 유형 | 카테고리 |
 * 
 * 2) 단일 시트에 보험 전체
 *    | 보험회사 | 상품명 | 보장명 | 보장금액 | 유형 | 카테고리 | 월보험료 | 계약일 | 만기일 |
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: '파일을 업로드해주세요.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const policies: Policy[] = [];

        // Strategy: Check first sheet structure
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const firstData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

        if (firstData.length === 0) {
            return NextResponse.json({ error: '엑셀 파일에 데이터가 없습니다.' }, { status: 400 });
        }

        const headers = Object.keys(firstData[0]);
        const hasInsurerColumn = headers.some(h =>
            ['보험회사', '보험사', 'insurer', '회사'].some(k => h.includes(k))
        );

        if (hasInsurerColumn) {
            // Format 2: Single sheet with all policies
            const parsed = parseSingleSheet(firstData);
            policies.push(...parsed);
        } else {
            // Format 1: Each sheet is one policy
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
                if (data.length === 0) continue;

                const policy = parseSheetAsPolicy(sheetName, data);
                if (policy) policies.push(policy);
            }
        }

        if (policies.length === 0) {
            return NextResponse.json({
                error: '보험 데이터를 파싱할 수 없습니다. 형식을 확인해주세요.',
            }, { status: 400 });
        }

        return NextResponse.json({ policies });
    } catch (error) {
        console.error('Excel parse error:', error);
        return NextResponse.json({
            error: `엑셀 파싱 오류: ${(error as Error).message}`,
        }, { status: 500 });
    }
}

function findColumn(headers: string[], ...keywords: string[]): string | undefined {
    return headers.find(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
}

function parseSingleSheet(data: Record<string, unknown>[]): Policy[] {
    const headers = Object.keys(data[0]);

    const colInsurer = findColumn(headers, '보험회사', '보험사', 'insurer', '회사');
    const colProduct = findColumn(headers, '상품명', '상품', 'product', '보험명');
    const colCovName = findColumn(headers, '보장명', '보장', '특약', 'coverage', '담보');
    const colAmount = findColumn(headers, '보장금액', '금액', '가입금액', 'amount');
    const colType = findColumn(headers, '유형', '보장유형', 'type', '구분');
    const colCategory = findColumn(headers, '카테고리', 'category', '분류');
    const colPremium = findColumn(headers, '보험료', '월보험료', 'premium');
    const colContract = findColumn(headers, '계약일', '가입일', 'contract');
    const colExpiry = findColumn(headers, '만기일', '만기', 'expiry');
    const colRenewal = findColumn(headers, '갱신', '갱신유형', 'renewal');

    // Group by insurer + product
    const policyMap = new Map<string, Policy>();

    for (const row of data) {
        const insurer = String(row[colInsurer || ''] || '').trim();
        const product = String(row[colProduct || ''] || '').trim();
        if (!insurer && !product) continue;

        const key = `${insurer}||${product}`;
        if (!policyMap.has(key)) {
            policyMap.set(key, {
                insurer: insurer || '미정',
                product_name: product || '미정',
                contract_date: colContract ? String(row[colContract] || '') : '',
                expiry_date: colExpiry ? String(row[colExpiry] || '') : '',
                monthly_premium: colPremium ? Number(row[colPremium]) || 0 : 0,
                status: '유지',
                renewal_type: colRenewal ? (String(row[colRenewal] || '').includes('갱신') ? '갱신' : '비갱신') : '비갱신',
                coverages: [],
            });
        }

        const covName = String(row[colCovName || ''] || '').trim();
        const covAmount = colAmount ? Number(row[colAmount]) || 0 : 0;
        if (covName && covAmount > 0) {
            policyMap.get(key)!.coverages.push({
                coverage_name: covName,
                coverage_amount: covAmount,
                coverage_type: guessType(colType ? String(row[colType] || '') : covName),
                category: colCategory ? String(row[colCategory] || '') : guessCategory(covName),
            });
        }
    }

    return Array.from(policyMap.values());
}

function parseSheetAsPolicy(sheetName: string, data: Record<string, unknown>[]): Policy | null {
    const headers = Object.keys(data[0]);

    const colCovName = findColumn(headers, '보장명', '보장', '특약', '담보', '항목');
    const colAmount = findColumn(headers, '보장금액', '금액', '가입금액', 'amount');
    const colType = findColumn(headers, '유형', '보장유형', 'type', '구분');
    const colCategory = findColumn(headers, '카테고리', 'category', '분류');

    const coverages: Coverage[] = [];
    for (const row of data) {
        const name = String(row[colCovName || headers[0]] || '').trim();
        const amount = colAmount ? Number(row[colAmount]) || 0 : Number(row[headers[1]]) || 0;
        if (!name || amount <= 0) continue;

        coverages.push({
            coverage_name: name,
            coverage_amount: amount,
            coverage_type: guessType(colType ? String(row[colType] || '') : name),
            category: colCategory ? String(row[colCategory] || '') : guessCategory(name),
        });
    }

    if (coverages.length === 0) return null;

    // Parse sheet name for insurer/product
    const parts = sheetName.split(/[-–—]/);
    const insurer = parts[0]?.trim() || sheetName;
    const product = parts.slice(1).join('-').trim() || sheetName;

    return {
        insurer,
        product_name: product,
        contract_date: '',
        expiry_date: '',
        monthly_premium: 0,
        status: '유지',
        coverages,
    };
}

function guessType(text: string): Coverage['coverage_type'] {
    const t = text.toLowerCase();
    if (t.includes('진단')) return '진단';
    if (t.includes('일당') || t.includes('입원')) return '일당';
    if (t.includes('수술')) return '수술';
    if (t.includes('사망')) return '사망';
    if (t.includes('실손')) return '실손';
    if (t.includes('배상') || t.includes('운전')) return '배상';
    if (t.includes('장해') || t.includes('장애')) return '후유장해';
    return '기타';
}

function guessCategory(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('암') || n.includes('cancer')) return '암';
    if (n.includes('뇌') || n.includes('뇌혈관')) return '뇌혈관';
    if (n.includes('심장') || n.includes('심근') || n.includes('심부전') || n.includes('허혈') || n.includes('협심')) return '심장';
    if (n.includes('사망')) return '사망';
    if (n.includes('입원') || n.includes('일당')) return '입원';
    if (n.includes('수술')) return '수술';
    if (n.includes('통원') || n.includes('처방')) return '통원';
    if (n.includes('실손')) return '실손';
    if (n.includes('장해') || n.includes('장애')) return '후유장해';
    if (n.includes('배상') || n.includes('운전')) return '배상책임';
    return '기타';
}
