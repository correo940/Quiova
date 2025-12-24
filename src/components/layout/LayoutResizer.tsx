'use client';

import { useJournal } from '@/context/JournalContext';
import { motion } from 'framer-motion';

export default function LayoutResizer({ children }: { children: React.ReactNode }) {
    const { isOpen, width } = useJournal();

    return (
        <motion.div
            animate={{
                paddingRight: isOpen ? `${width}%` : '0%'
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full transition-all"
        >
            {children}
        </motion.div>
    );
}
