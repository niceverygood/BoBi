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
                    background: 'linear-gradient(135deg, #1e6bb8 0%, #0f4c8a 100%)',
                }}
            >
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: 'white',
                        lineHeight: 1,
                        letterSpacing: -1,
                    }}
                >
                    B
                </div>
            </div>
        ),
        { ...size },
    );
}
