import { BrainCircuit, HeartPulse, Landmark } from 'lucide-react';
import type { ArticleCategory } from '@/types';
import type { LucideProps } from 'lucide-react';

type CategoryIconProps = LucideProps & {
  category: ArticleCategory;
};

export default function CategoryIcon({ category, ...props }: CategoryIconProps) {
  switch (category) {
    case 'physical health':
      return <HeartPulse {...props} />;
    case 'mental health':
      return <BrainCircuit {...props} />;
    case 'family finance':
      return <Landmark {...props} />;
    default:
      return null;
  }
}
