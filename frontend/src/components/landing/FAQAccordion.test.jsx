import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FAQAccordion from './FAQAccordion.jsx';

describe('FAQAccordion', () => {
  it('opens the first question by default and shows its answer', () => {
    render(<FAQAccordion />);
    const firstQuestion = screen.getByRole('button', { name: /what is contract farming/i });
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles a question open and closed on click', async () => {
    const user = userEvent.setup();
    render(<FAQAccordion />);

    const paymentsQuestion = screen.getByRole('button', { name: /how are payments secured/i });
    expect(paymentsQuestion).toHaveAttribute('aria-expanded', 'false');

    await user.click(paymentsQuestion);
    expect(paymentsQuestion).toHaveAttribute('aria-expanded', 'true');

    await user.click(paymentsQuestion);
    expect(paymentsQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the previously open question when a new one is opened', async () => {
    const user = userEvent.setup();
    render(<FAQAccordion />);

    const firstQuestion = screen.getByRole('button', { name: /what is contract farming/i });
    const secondQuestion = screen.getByRole('button', { name: /how are payments secured/i });

    await user.click(secondQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
    expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');
  });
});
