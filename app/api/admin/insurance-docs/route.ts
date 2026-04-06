// app/api/admin/insurance-docs/route.ts
// 보험 약관 관리 API (관리자 전용)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';
import { INSURANCE_SOURCES } from '@/lib/insurance/crawl-sources';

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    let hasAccess = false;
    if (user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email)) hasAccess = true;
    else {
        const { data: sa } = await supabase.from('sub_admins').select('id').eq('email', user.email).eq('active', true).maybeSingle();
        if (sa) hasAccess = true;
    }
    return hasAccess ? user : null;
}

async function getServiceSupabase() {
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sk) throw new Error('SERVICE_ROLE_KEY 미설정');
    const { createClient: c } = await import('@supabase/supabase-js');
    return c(process.env.NEXT_PUBLIC_SUPABASE_URL!, sk);
}

// GET: 약관 목록 조회
export async function GET() {
    try {
        const user = await checkAdmin();
        if (!user) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

        const svc = await getServiceSupabase();
        const { data } = await svc
            .from('insurance_docs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        return NextResponse.json({
            docs: data || [],
            sources: INSURANCE_SOURCES,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// POST: 약관 수동 등록 또는 URL 크롤링
export async function POST(request: Request) {
    try {
        const user = await checkAdmin();
        if (!user) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

        const body = await request.json();
        const { action } = body;

        const svc = await getServiceSupabase();

        if (action === 'crawl_url') {
            // URL에서 PDF 다운로드 시도
            const { url, insurer, productName } = body;
            if (!url) return NextResponse.json({ error: 'URL 필요' }, { status: 400 });

            try {
                const res = await fetch(url, { redirect: 'follow' });
                const contentType = res.headers.get('content-type') || '';
                const isPdf = contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf');

                if (!isPdf) {
                    // HTML 페이지 — PDF 링크 추출 시도
                    const html = await res.text();
                    const pdfLinks: string[] = [];
                    const regex = /href=["']([^"']*\.pdf[^"']*)/gi;
                    let match;
                    while ((match = regex.exec(html)) !== null) {
                        let link = match[1];
                        if (!link.startsWith('http')) {
                            const base = new URL(url);
                            link = link.startsWith('/') ? `${base.origin}${link}` : `${base.origin}/${link}`;
                        }
                        pdfLinks.push(link);
                    }

                    if (pdfLinks.length === 0) {
                        return NextResponse.json({
                            error: 'PDF 링크를 찾을 수 없습니다. 직접 PDF URL을 입력해주세요.',
                            html_preview: html.substring(0, 500),
                        }, { status: 400 });
                    }

                    // 발견된 PDF 링크들 저장
                    const docs = [];
                    for (const pdfUrl of pdfLinks.slice(0, 20)) { // 최대 20개
                        const fileName = decodeURIComponent(pdfUrl.split('/').pop() || 'unknown.pdf');
                        const { data: doc } = await svc
                            .from('insurance_docs')
                            .insert({
                                insurer: insurer || '미분류',
                                product_name: productName || fileName.replace('.pdf', ''),
                                file_name: fileName,
                                pdf_url: pdfUrl,
                                source_url: url,
                                status: 'discovered',
                                uploaded_by: user.email,
                            })
                            .select()
                            .single();
                        if (doc) docs.push(doc);
                    }

                    return NextResponse.json({
                        message: `${docs.length}개 PDF 링크 발견`,
                        docs,
                    });
                }

                // 직접 PDF URL인 경우
                const fileName = decodeURIComponent(url.split('/').pop() || 'document.pdf');
                const { data: doc } = await svc
                    .from('insurance_docs')
                    .insert({
                        insurer: insurer || '미분류',
                        product_name: productName || fileName.replace('.pdf', ''),
                        file_name: fileName,
                        pdf_url: url,
                        source_url: url,
                        status: 'discovered',
                        uploaded_by: user.email,
                    })
                    .select()
                    .single();

                return NextResponse.json({ message: 'PDF 등록 완료', doc });
            } catch (err) {
                return NextResponse.json({ error: `크롤링 실패: ${(err as Error).message}` }, { status: 500 });
            }
        }

        if (action === 'manual_add') {
            // 수동 등록
            const { insurer, productName, pdfUrl, memo } = body;
            if (!insurer || !productName) {
                return NextResponse.json({ error: '보험사와 상품명은 필수입니다.' }, { status: 400 });
            }

            const { data: doc } = await svc
                .from('insurance_docs')
                .insert({
                    insurer,
                    product_name: productName,
                    file_name: pdfUrl ? decodeURIComponent(pdfUrl.split('/').pop() || '') : '',
                    pdf_url: pdfUrl || '',
                    source_url: '',
                    status: pdfUrl ? 'active' : 'pending',
                    memo: memo || '',
                    uploaded_by: user.email,
                })
                .select()
                .single();

            return NextResponse.json({ message: '약관 등록 완료', doc });
        }

        return NextResponse.json({ error: '알 수 없는 action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// DELETE: 약관 삭제
export async function DELETE(request: Request) {
    try {
        const user = await checkAdmin();
        if (!user) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

        const svc = await getServiceSupabase();
        await svc.from('insurance_docs').delete().eq('id', id);

        return NextResponse.json({ message: '삭제 완료' });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
