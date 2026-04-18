// app/api/enterprise-inquiries/route.ts
// 엔터프라이즈/팀 플랜 문의 — 작성/조회 (관리자 모드 지원)

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ADMIN_EMAILS } from '@/lib/utils/constants';

const PHONE_RE = /^01[016789]\d{7,8}$/;

/** 본인이 관리자(super 또는 sub-admin)인지 확인 */
async function checkAdminAccess(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    if ((ADMIN_EMAILS as readonly string[]).includes(email)) return true;
    const svc = await createServiceClient();
    const { data } = await svc
        .from('sub_admins')
        .select('id')
        .eq('email', email)
        .eq('active', true)
        .maybeSingle();
    return !!data;
}

// ─────────────────────────────────────────
// POST: 엔터프라이즈 문의 작성
// ─────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const contactName = String(body.contactName || '').trim();
        const contactPhone = String(body.contactPhone || '').replace(/\D/g, '');
        const contactEmail = body.contactEmail ? String(body.contactEmail).trim() : null;
        const companyName = body.companyName ? String(body.companyName).trim() : null;
        const teamSize = body.teamSize ? String(body.teamSize).trim() : null;
        const inquiryMessage = String(body.inquiryMessage || '').trim();

        // 검증
        if (!contactName) {
            return NextResponse.json({ error: '담당자 이름을 입력해주세요.' }, { status: 400 });
        }
        if (!PHONE_RE.test(contactPhone)) {
            return NextResponse.json(
                { error: '연락받을 휴대폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)' },
                { status: 400 },
            );
        }
        if (!inquiryMessage || inquiryMessage.length < 10) {
            return NextResponse.json(
                { error: '문의 내용을 10자 이상 입력해주세요.' },
                { status: 400 },
            );
        }

        const svc = await createServiceClient();
        const { data, error } = await svc
            .from('enterprise_inquiries')
            .insert({
                user_id: user.id,
                contact_name: contactName,
                contact_phone: contactPhone,
                contact_email: contactEmail || user.email || null,
                company_name: companyName,
                team_size: teamSize,
                inquiry_message: inquiryMessage,
                status: 'new',
            })
            .select('id, created_at, status')
            .single();

        if (error) {
            console.error('[enterprise-inquiries] insert error:', error);
            return NextResponse.json({ error: '문의 등록 중 오류가 발생했습니다.' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, inquiry: data });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || '서버 오류가 발생했습니다.' },
            { status: 500 },
        );
    }
}

// ─────────────────────────────────────────
// GET: 본인 문의 목록 (?admin=true 시 관리자 전체)
// ─────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const isAdminMode = searchParams.get('admin') === 'true';
        const svc = await createServiceClient();

        if (isAdminMode) {
            const isAdmin = await checkAdminAccess(user.email);
            if (!isAdmin) {
                return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
            }

            const status = searchParams.get('status'); // 옵션 필터
            let query = svc
                .from('enterprise_inquiries')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }
            const { data, error } = await query;
            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            // user 이메일/이름 조인
            const userIds = [...new Set((data || []).map(d => d.user_id))];
            const { data: profiles } = await svc
                .from('profiles')
                .select('id, email, full_name, name')
                .in('id', userIds);
            const userMap = new Map((profiles || []).map(p => [p.id, p]));

            const enriched = (data || []).map(d => ({
                ...d,
                user_email: userMap.get(d.user_id)?.email || '-',
                user_name:
                    (userMap.get(d.user_id) as { full_name?: string; name?: string } | undefined)?.full_name ||
                    (userMap.get(d.user_id) as { full_name?: string; name?: string } | undefined)?.name ||
                    '-',
            }));

            return NextResponse.json({ inquiries: enriched });
        }

        // 본인 목록
        const { data, error } = await svc
            .from('enterprise_inquiries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ inquiries: data || [] });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || '서버 오류' },
            { status: 500 },
        );
    }
}

// ─────────────────────────────────────────
// PATCH: 관리자가 상태/메모 업데이트
// ─────────────────────────────────────────
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const isAdmin = await checkAdminAccess(user.email);
        if (!isAdmin) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        const body = await request.json();
        const id = String(body.id || '').trim();
        if (!id) {
            return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
        }

        const updates: Record<string, unknown> = {};
        if (body.status) {
            const validStatuses = ['new', 'contacted', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(body.status)) {
                return NextResponse.json({ error: '잘못된 상태값입니다.' }, { status: 400 });
            }
            updates.status = body.status;
        }
        if (body.adminMemo !== undefined) updates.admin_memo = String(body.adminMemo);
        if (body.status === 'contacted' || body.status === 'in_progress' || body.status === 'completed') {
            updates.handled_by = user.id;
            updates.handled_at = new Date().toISOString();
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: '업데이트할 내용이 없습니다.' }, { status: 400 });
        }

        const svc = await createServiceClient();
        const { data, error } = await svc
            .from('enterprise_inquiries')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, inquiry: data });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || '서버 오류' },
            { status: 500 },
        );
    }
}
