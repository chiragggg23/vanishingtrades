import { useEffect } from 'react';

/** Sets document.title as "<title> · VanishingTrades". */
export function usePageTitle(title) {
  useEffect(() => {
    if (title) document.title = `${title} · VanishingTrades`;
    else document.title = 'VanishingTrades';
  }, [title]);
}
