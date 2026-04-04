'use client';

import { cn } from '@/lib/utils';

interface BobiLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const SIZES = {
    sm: { container: 'w-8 h-8', b: 'text-[14px]', dot: 'w-2 h-2 top-[3px] right-[3px] border', inner: 'w-[5px] h-[5px]' },
    md: { container: 'w-9 h-9', b: 'text-[16px]', dot: 'w-2.5 h-2.5 top-[3px] right-[3px] border-[1.5px]', inner: 'w-[6px] h-[6px]' },
    lg: { container: 'w-11 h-11', b: 'text-[20px]', dot: 'w-3 h-3 top-[4px] right-[4px] border-[1.5px]', inner: 'w-[7px] h-[7px]' },
    xl: { container: 'w-14 h-14', b: 'text-[26px]', dot: 'w-3.5 h-3.5 top-[5px] right-[5px] border-2', inner: 'w-2 h-2' },
};

export default function BobiLogo({ size = 'md', className }: BobiLogoProps) {
    const s = SIZES[size];

    return (
        <div className={cn('relative rounded-xl bg-[#1a56db] flex items-center justify-center', s.container, className)}>
            {/* B */}
            <span className={cn('font-black text-white leading-none', s.b)}>B</span>
            {/* Cyan dot */}
            <div className={cn('absolute rounded-full bg-[#38bdf8] border-white flex items-center justify-center', s.dot)}>
                <div className={cn('rounded-full bg-white', s.inner)} />
            </div>
        </div>
    );
}
