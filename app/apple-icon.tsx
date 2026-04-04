import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 180,
                    height: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 40,
                    background: '#1a56db',
                    position: 'relative',
                }}
            >
                <div style={{ fontSize: 90, fontWeight: 900, color: 'white', lineHeight: 1 }}>B</div>
                <div
                    style={{
                        position: 'absolute',
                        top: 25,
                        right: 25,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#38bdf8',
                        border: '4px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white' }} />
                </div>
            </div>
        ),
        { ...size },
    );
}
