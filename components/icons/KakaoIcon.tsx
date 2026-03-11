'use client';

export function KakaoIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2.4C6.268 2.4 1.6 6.105 1.6 10.643c0 2.934 1.944 5.51 4.872 6.964-.214.798-.775 2.89-.888 3.34-.138.557.204.55.43.4.177-.118 2.817-1.918 3.965-2.698.646.094 1.313.143 1.994.143h.027C17.732 18.792 22.4 15.087 22.4 10.643 22.4 6.105 17.732 2.4 12 2.4Z"
                fill="#181600"
            />
        </svg>
    );
}
