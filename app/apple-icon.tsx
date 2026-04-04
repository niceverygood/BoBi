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
                    background: 'linear-gradient(135deg, #1e6bb8 0%, #0f4c8a 100%)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 900,
                            color: 'white',
                            lineHeight: 1,
                            letterSpacing: -3,
                        }}
                    >
                        B
                    </div>
                </div>
            </div>
        ),
        { ...size },
    );
}
