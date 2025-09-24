import type { Article, ArticleCategory } from '@/types';
import { PlaceHolderImages } from './placeholder-images';
import { slugify } from './utils';

const getImage = (id: string) => {
  const img = PlaceHolderImages.find((p) => p.id === id);
  if (!img) return { url: 'https://picsum.photos/seed/error/600/400', hint: 'placeholder image' };
  return { url: img.imageUrl, hint: img.imageHint };
};

const articles: Omit<Article, 'slug'>[] = [
  {
    id: '1',
    title: 'The 10-Minute Morning Workout for Busy People',
    excerpt: 'Jumpstart your day with this quick and effective workout routine that you can do from anywhere.',
    content: `<p>Finding time to exercise can be a challenge, but even a short workout can make a huge difference in your energy levels and overall health. This 10-minute routine is designed to get your heart rate up and activate major muscle groups, setting a positive tone for the rest of your day.</p>
    <h3>The Routine:</h3>
    <ul>
      <li><strong>1 Minute:</strong> Jumping Jacks</li>
      <li><strong>1 Minute:</strong> High Knees</li>
      <li><strong>2 Minutes:</strong> Bodyweight Squats</li>
      <li><strong>2 Minutes:</strong> Push-ups (on knees if needed)</li>
      <li><strong>2 Minutes:</strong> Plank</li>
      <li><strong>2 Minutes:</strong> Glute Bridges</li>
    </ul>
    <p>Perform each exercise with minimal rest in between. Remember to listen to your body and modify as needed. Consistency is key, so aim to do this routine at least 3-4 times a week.</p>`,
    category: 'physical health',
    imageUrl: getImage('article-1').url,
    imageHint: getImage('article-1').hint,
    author: 'Dr. Elena Vance',
    authorImageUrl: getImage('author-1').url,
    authorImageHint: getImage('author-1').hint,
    date: 'June 15, 2024',
    featured: true,
  },
  {
    id: '2',
    title: 'Mindfulness for Beginners: A Guide to a Calmer Mind',
    excerpt: 'Learn the basics of mindfulness and how it can help reduce stress and improve your focus.',
    content: `<p>In our fast-paced world, finding moments of peace can feel impossible. Mindfulness is the practice of being present and fully aware of the current moment — without judgment. It's a powerful tool for managing stress, anxiety, and improving your overall mental well-being.</p>
    <h3>How to Start:</h3>
    <ol>
      <li><strong>Find a Quiet Space:</strong> Sit in a comfortable position where you won't be disturbed.</li>
      <li><strong>Focus on Your Breath:</strong> Close your eyes and bring your attention to the sensation of your breath entering and leaving your body.</li>
      <li><strong>Acknowledge Your Thoughts:</strong> Your mind will wander. When it does, gently acknowledge the thought and guide your focus back to your breath.</li>
      <li><strong>Start Small:</strong> Begin with just 5 minutes a day and gradually increase the time as you feel more comfortable.</li>
    </ol>
    <p>There are many guided meditation apps and videos online that can help you get started. The goal isn't to stop thinking, but to observe your thoughts without getting carried away by them.</p>`,
    category: 'mental health',
    youtubeUrl: 'https://www.youtube.com/watch?v=O-6f5wQXSu8',
    imageUrl: getImage('article-2').url,
    imageHint: getImage('article-2').hint,
    author: 'Mark Chen',
    authorImageUrl: getImage('author-2').url,
    authorImageHint: getImage('author-2').hint,
    date: 'June 12, 2024',
    featured: true,
  },
  {
    id: '3',
    title: 'Creating a Family Budget That Actually Works',
    excerpt: 'A step-by-step guide to help your family gain control over your finances and save for the future.',
    content: `<p>A budget is not about restriction; it's about empowerment. It gives you a clear picture of where your money is going and helps you make intentional decisions that align with your family's goals. Here’s how to create one that sticks.</p>
    <h3>Steps to Success:</h3>
    <ol>
      <li><strong>Track Your Spending:</strong> For one month, track every single expense. This will reveal your spending habits.</li>
      <li><strong>Set Financial Goals:</strong> What are you saving for? A vacation, a new car, retirement? Having clear goals provides motivation.</li>
      <li><strong>Categorize Expenses:</strong> Divide your spending into fixed costs (rent, mortgage) and variable costs (groceries, entertainment).</li>
      <li><strong>Create Your Budget:</strong> Use a simple spreadsheet or a budgeting app. The 50/30/20 rule is a great starting point: 50% for needs, 30% for wants, and 20% for savings and debt repayment.</li>
      <li><strong>Review and Adjust:</strong> A budget is a living document. Review it monthly and adjust as your income or expenses change.</li>
    </ol>
    <p>Getting the whole family involved can increase your chances of success. Make it a team effort!</p>`,
    category: 'family finance',
    imageUrl: getImage('article-3').url,
    imageHint: getImage('article-3').hint,
    author: 'Sofia Rodriguez',
    authorImageUrl: getImage('author-3').url,
    authorImageHint: getImage('author-3').hint,
    date: 'June 10, 2024',
  },
  {
    id: '4',
    title: 'The Benefits of High-Intensity Interval Training (HIIT)',
    excerpt: 'Discover why HIIT is one of the most efficient ways to burn fat, improve heart health, and boost your metabolism.',
    content: `<p>High-Intensity Interval Training (HIIT) involves short bursts of intense exercise alternated with low-intensity recovery periods. It's the secret to getting more done in less time.</p>
    <h3>Why HIIT Works:</h3>
    <ul>
      <li><strong>Time-Efficient:</strong> Get the benefits of a longer workout in just 15-20 minutes.</li>
      <li><strong>Burns More Calories:</strong> HIIT can burn more calories than traditional cardio, both during and after the workout (the "afterburn effect").</li>
      <li><strong>Improves Heart Health:</strong> Pushing your heart rate into the anaerobic zone improves its efficiency and strength.</li>
    </ul>
    <p>A sample HIIT workout could be 30 seconds of sprints followed by 60 seconds of walking, repeated 8-10 times. You can apply this principle to cycling, swimming, or bodyweight exercises.</p>`,
    category: 'physical health',
    imageUrl: getImage('article-4').url,
    imageHint: getImage('article-4').hint,
    author: 'Dr. Elena Vance',
    authorImageUrl: getImage('author-1').url,
    authorImageHint: getImage('author-1').hint,
    date: 'May 28, 2024',
  },
  {
    id: '5',
    title: 'How to Teach Kids About Money',
    excerpt: 'It\'s never too early to start teaching financial literacy. Here are age-appropriate ways to talk to your kids about money.',
    content: `<p>Financial literacy is a critical life skill. By introducing concepts early, you can set your children up for a lifetime of financial well-being.</p>
    <h3>Age-by-Age Guide:</h3>
    <ul>
      <li><strong>Ages 3-5:</strong> Introduce the concept of money and coins. Use a clear jar for savings so they can see it grow.</li>
      <li><strong>Ages 6-10:</strong> Introduce the concept of an allowance for chores. Help them divide their money into "Save," "Spend," and "Share" jars.</li>
      <li><strong>Ages 11-13:</strong> Open a savings account for them. Discuss needs vs. wants and the importance of delayed gratification.</li>
      <li><strong>Ages 14-18:</strong> Talk about concepts like compound interest, credit, and student loans. Consider helping them get a part-time job.</li>
    </ul>
    <p>The most important thing is to be open and honest about money. Let them see you making smart financial decisions.</p>`,
    category: 'family finance',
    youtubeUrl: 'https://www.youtube.com/watch?v=l_8I3C_L1e4',
    imageUrl: getImage('article-5').url,
    imageHint: getImage('article-5').hint,
    author: 'Sofia Rodriguez',
    authorImageUrl: getImage('author-3').url,
    authorImageHint: getImage('author-3').hint,
    date: 'May 25, 2024',
    featured: true,
  },
  {
    id: '6',
    title: 'The Power of Journaling for Mental Clarity',
    excerpt: 'Putting your thoughts on paper can be a simple yet profound way to manage anxiety and understand your emotions.',
    content: `<p>Journaling is a form of self-care that requires nothing more than a pen and paper. It provides a safe space to explore your thoughts and feelings without fear of judgment.</p>
    <h3>Getting Started with Journaling:</h3>
    <ul>
      <li><strong>Don't Overthink It:</strong> Just start writing. It doesn't have to be perfect. Use bullet points, draw, or write freely.</li>
      <li><strong>Try Prompts:</strong> If you're stuck, use a prompt. "What am I grateful for today?" or "What is currently weighing on my mind?" are great places to start.</li>
      <li><strong>Make It a Habit:</strong> Try to set aside a few minutes each day, perhaps in the morning or before bed, to write in your journal.</li>
    </ul>
    <p>Regular journaling can help you identify patterns in your thinking, process difficult events, and cultivate a more positive outlook on life.</p>`,
    category: 'mental health',
    imageUrl: getImage('article-6').url,
    imageHint: getImage('article-6').hint,
    author: 'Mark Chen',
    authorImageUrl: getImage('author-2').url,
    authorImageHint: getImage('author-2').hint,
    date: 'May 20, 2024',
  },
];

export const allArticles: Article[] = articles.map(article => ({
  ...article,
  slug: slugify(article.title),
}));

export const categories: ArticleCategory[] = ['physical health', 'mental health', 'family finance'];
