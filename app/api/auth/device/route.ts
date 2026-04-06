// app/api/auth/device/route.ts
// 기기 세션 관리: 최대 2대 기기, 3번째는 차단, 월 1회 변경 가능
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_DEVICES = 2;

async function getServiceSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error('SERVICE_ROLE_KEY 미설정');
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

// POST: 기기 등록 (3번째 기기는 차단)
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { deviceId, deviceName, deviceType } = await request.json();
        if (!deviceId) return NextResponse.json({ error: 'deviceId 필요' }, { status: 400 });

        const adminSupabase = await getServiceSupabase();

        const { data: devices } = await adminSupabase
            .from('user_devices')
            .select('*')
            .eq('user_id', user.id)
            .order('last_active', { ascending: false });

        const currentDevices = devices || [];

        // 이미 등록된 기기 → last_active 업데이트
        const existing = currentDevices.find(d => d.device_id === deviceId);
        if (existing) {
            await adminSupabase
                .from('user_devices')
                .update({ last_active: new Date().toISOString(), device_name: deviceName || existing.device_name })
                .eq('id', existing.id);

            return NextResponse.json({ allowed: true, deviceCount: currentDevices.length });
        }

        // 새 기기 — 기기 수 초과 시 차단 (자동 삭제 안 함)
        if (currentDevices.length >= MAX_DEVICES) {
            return NextResponse.json({
                allowed: false,
                error: `기기 수 제한(${MAX_DEVICES}대)에 도달했습니다. 설정 > 기기 관리에서 기존 기기를 제거한 후 다시 시도해주세요.`,
                deviceCount: currentDevices.length,
                devices: currentDevices.map(d => ({ name: d.device_name, type: d.device_type, lastActive: d.last_active })),
            }, { status: 403 });
        }

        // 새 기기 등록
        await adminSupabase
            .from('user_devices')
            .insert({
                user_id: user.id,
                device_id: deviceId,
                device_name: deviceName || '알 수 없는 기기',
                device_type: deviceType || 'unknown',
                last_active: new Date().toISOString(),
            });

        return NextResponse.json({ allowed: true, deviceCount: currentDevices.length + 1 });
    } catch (error) {
        console.error('Device registration error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// GET: 내 기기 목록 + 마지막 변경 일시
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const adminSupabase = await getServiceSupabase();

        const { data: devices } = await adminSupabase
            .from('user_devices')
            .select('*')
            .eq('user_id', user.id)
            .order('last_active', { ascending: false });

        // 마지막 기기 변경(삭제) 일시 조회
        const lastChanged = user.user_metadata?.last_device_change || null;
        const now = new Date();
        const canChange = !lastChanged || (now.getTime() - new Date(lastChanged).getTime()) > 30 * 24 * 60 * 60 * 1000;

        // 다음 변경 가능 일시
        let nextChangeDate = null;
        if (lastChanged) {
            const next = new Date(lastChanged);
            next.setDate(next.getDate() + 30);
            if (next > now) nextChangeDate = next.toISOString();
        }

        return NextResponse.json({
            devices: devices || [],
            maxDevices: MAX_DEVICES,
            canChange,
            nextChangeDate,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// DELETE: 기기 제거 (월 1회 제한)
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const deviceId = searchParams.get('deviceId');
        if (!deviceId) return NextResponse.json({ error: 'deviceId 필요' }, { status: 400 });

        // 월 1회 변경 제한 확인
        const lastChanged = user.user_metadata?.last_device_change;
        if (lastChanged) {
            const diff = Date.now() - new Date(lastChanged).getTime();
            const daysLeft = Math.ceil((30 * 24 * 60 * 60 * 1000 - diff) / (24 * 60 * 60 * 1000));
            if (diff < 30 * 24 * 60 * 60 * 1000) {
                return NextResponse.json({
                    error: `기기 변경은 월 1회만 가능합니다. ${daysLeft}일 후에 다시 시도해주세요.`,
                }, { status: 429 });
            }
        }

        const adminSupabase = await getServiceSupabase();

        // 기기 삭제
        const { error } = await adminSupabase
            .from('user_devices')
            .delete()
            .eq('user_id', user.id)
            .eq('device_id', deviceId);

        if (error) {
            return NextResponse.json({ error: '기기 제거 실패' }, { status: 500 });
        }

        // 변경 일시 기록 (user_metadata에 저장)
        await adminSupabase.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, last_device_change: new Date().toISOString() },
        });

        return NextResponse.json({ message: '기기가 제거되었습니다. 다음 변경은 30일 후 가능합니다.' });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
