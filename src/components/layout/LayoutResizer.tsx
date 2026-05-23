'use client';

import { useEffect, useState } from 'react';
import { useJournal } from '@/context/JournalContext';
import { useAi } from '@/context/AiContext';
import { motion } from 'framer-motion';

export default function LayoutResizer({ children }: { children: React.ReactNode }) {
    const { isOpen: isJournalOpen, width: journalWidth } = useJournal();
    const { isOpen: isAiOpen, width: aiWidth } = useAi();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    if (isMobile) {
        return (
            <motion.div
                animate={{ paddingBottom: isJournalOpen ? '50vh' : '0px' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full"
            >
                {children}
            </motion.div>
        );
    }

    let paddingRight = 0;
    if (isJournalOpen) paddingRight += journalWidth;
    if (isAiOpen) paddingRight += aiWidth;

    return (
        <motion.div
            animate={{ paddingRight: `${paddingRight}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full transition-all"
        >
            {children}
        </motion.div>
    );
}
