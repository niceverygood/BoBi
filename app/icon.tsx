import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background: '#1a56db',
                    position: 'relative',
                }}
            >
                <div style={{ fontSize: 18, fontWeight: 900, color: 'white', lineHeight: 1 }}>B</div>
                <div
                    style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#38bdf8',
                        border: '1.5px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'white' }} />
                </div>
            </div>
        ),
        { ...size },
    );
}
