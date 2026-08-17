import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';
import { FieldContext } from './fieldContext';
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

  it("renders a placeholder that is not the field's accessible name", () => {
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

  it('fills the width of its container', () => {
    render(
      <Input id="email" name="email" type="text" value="" onChange={vi.fn()} />,
    );

    expect(screen.getByRole('textbox')).toHaveClass('w-full');
  });

  it('shows a danger border when the field context marks it invalid', () => {
    render(
      <FieldContext.Provider value={{ invalid: true, required: false }}>
        <Input
          id="password"
          name="password"
          type="password"
          value=""
          onChange={vi.fn()}
        />
      </FieldContext.Provider>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- a password input has no accessible textbox role; there is no RTL query for it outside a labelled Field.
    const input = document.getElementById('password');
    expect(input).toHaveClass('border-danger');
    expect(input).not.toHaveClass('border-border-field');
  });
});
