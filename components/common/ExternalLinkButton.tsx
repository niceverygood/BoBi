'use client';

import { Button } from '@/components/ui/button';
import { openExternal } from '@/lib/open-external';
import type { ComponentProps, ReactNode } from 'react';

interface ExternalLinkButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  url: string;
  children: ReactNode;
}

export function ExternalLinkButton({ url, children, ...props }: ExternalLinkButtonProps) {
  return (
    <Button onClick={() => openExternal(url)} {...props}>
      {children}
    </Button>
  );
}
