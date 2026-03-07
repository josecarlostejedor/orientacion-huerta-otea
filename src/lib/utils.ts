import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeString(str: string): string {
  if (!str) return '';
  
  // Common Spanish stop words to ignore for more flexible matching
  const stopWords = ['para', 'de', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'con'];
  
  let normalized = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
    
  // Split into words, filter out stop words, and join back
  const words = normalized.split(/\s+/);
  const filteredWords = words.filter(word => !stopWords.includes(word));
  
  // Join and remove all non-alphanumeric characters
  return filteredWords.join('').replace(/[^a-z0-9]/g, '');
}
