// app/api/auth/device/route.ts
// 기기 세션 관리: 최대 2대 기기만 허용
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_DEVICES = 2;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { deviceId, deviceName, deviceType } = await request.json();
        if (!deviceId) return NextResponse.json({ error: 'deviceId 필요' }, { status: 400 });

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) return NextResponse.json({ error: 'SERVICE_ROLE_KEY 미설정' }, { status: 500 });

        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminSupabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

        // 현재 활성 기기 목록 조회
        const { data: devices } = await adminSupabase
            .from('user_devices')
            .select('*')
            .eq('user_id', user.id)
            .order('last_active', { ascending: false });

        const currentDevices = devices || [];

        // 이미 등록된 기기면 last_active 업데이트
        const existing = currentDevices.find(d => d.device_id === deviceId);
        if (existing) {
            await adminSupabase
                .from('user_devices')
                .update({ last_active: new Date().toISOString(), device_name: deviceName || existing.device_name })
                .eq('id', existing.id);

            return NextResponse.json({ allowed: true, deviceCount: currentDevices.length });
        }

        // 새 기기 — 최대 기기 수 확인
        if (currentDevices.length >= MAX_DEVICES) {
            // 가장 오래된 기기 제거 (FIFO)
            const oldest = currentDevices[currentDevices.length - 1];
            await adminSupabase
                .from('user_devices')
                .delete()
                .eq('id', oldest.id);
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

        const newCount = Math.min(currentDevices.length + 1, MAX_DEVICES);

        return NextResponse.json({
            allowed: true,
            deviceCount: newCount,
            message: currentDevices.length >= MAX_DEVICES
                ? `기기 수 제한(${MAX_DEVICES}대)으로 이전 기기가 로그아웃되었습니다.`
                : undefined,
        });
    } catch (error) {
        console.error('Device registration error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// GET: 내 기기 목록 조회
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { data: devices } = await supabase
            .from('user_devices')
            .select('*')
            .eq('user_id', user.id)
            .order('last_active', { ascending: false });

        return NextResponse.json({ devices: devices || [], maxDevices: MAX_DEVICES });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// DELETE: 특정 기기 로그아웃
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const deviceId = searchParams.get('deviceId');
        if (!deviceId) return NextResponse.json({ error: 'deviceId 필요' }, { status: 400 });

        await supabase
            .from('user_devices')
            .delete()
            .eq('user_id', user.id)
            .eq('device_id', deviceId);

        return NextResponse.json({ message: '기기가 제거되었습니다.' });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
