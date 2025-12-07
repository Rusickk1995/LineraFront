import { Suit, Rank } from '../types/poker';

export const getSuitSymbol = (suit: Suit): string => {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit];
};

export const getSuitColor = (suit: Suit): string => {
  return suit === 'hearts' || suit === 'diamonds' ? '#E50000' : '#000000';
};

export const formatChips = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};
