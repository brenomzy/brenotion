import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display-money',
        'title-screen',
        'title-section',
        'body',
        'label',
        'caption',
        'overline',
      ],
      radius: ['control', 'card'],
      shadow: ['card'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
