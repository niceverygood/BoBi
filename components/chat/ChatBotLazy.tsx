'use client';

import dynamic from 'next/dynamic';

const ChatBot = dynamic(() => import('./ChatBot'), {
    ssr: false,
    loading: () => null,
});

export default function ChatBotLazy() {
    return <ChatBot />;
}
