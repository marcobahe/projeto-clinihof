import { useEffect, useState } from 'react';

/**
 * Custom hook for count-up animation
 * Animates a number from 0 to the target value
 */
export function useCountUp(
  target: number,
  duration: number = 2000,
  decimals: number = 0
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      const currentCount = easeProgress * target;
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration]);

  return decimals > 0 ? Number(count.toFixed(decimals)) : Math.floor(count);
}
