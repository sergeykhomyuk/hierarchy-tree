import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';
import { Input } from './Input';

describe('Input', () => {
  it('renders read-only without leaving the accessibility tree', () => {
    render(
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="text"
          value="person@example.com"
          onChange={vi.fn()}
          readOnly
        />
      </Field>,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('readonly');
    expect(input).not.toHaveAttribute('aria-hidden');
    expect(input).toBeVisible();
  });

  it('renders a placeholder that is not the field\'s accessible name', () => {
    render(
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="text"
          value=""
          onChange={vi.fn()}
          placeholder="you@foo.com"
        />
      </Field>,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('placeholder', 'you@foo.com');
    expect(input).toHaveAccessibleName('Email');
  });
});
