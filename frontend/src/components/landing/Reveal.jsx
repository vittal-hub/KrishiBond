import React from 'react';
import { useInView } from '../../hooks/useInView.js';

// Generic scroll-reveal wrapper - fades/slides children in the first time
// they enter the viewport. `delay` is in ms, staggered by callers mapping
// over a list. Respects prefers-reduced-motion globally via index.css.
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}
