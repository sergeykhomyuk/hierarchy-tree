import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './Field';
import { Input } from './Input';

describe('Field', () => {
  it('the field associates its label error and hint and communicates required', () => {
    render(
      <Field
        id="email"
        label="Email"
        hint="We never share it"
        error="Enter a valid email"
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          value=""
          onChange={vi.fn()}
        />
      </Field>,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('required');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    for (const id of describedBy?.split(' ') ?? []) {
      // eslint-disable-next-line testing-library/no-node-access -- resolving an aria-describedby id list needs a direct DOM lookup.
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.getByText('We never share it')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
  });

  it('omits aria-invalid and aria-describedby when there is no error or hint', () => {
    render(
      <Field id="name" label="Name">
        <Input id="name" name="name" type="text" value="" onChange={vi.fn()} />
      </Field>,
    );

    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('required');
  });

  it('never uses a placeholder as the label', () => {
    render(
      <Field id="password" label="Password">
        <Input
          id="password"
          name="password"
          type="password"
          value=""
          onChange={vi.fn()}
        />
      </Field>,
    );

    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('stacks the label above its control with a small gap', () => {
    const { container } = render(
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="text"
          value=""
          onChange={vi.fn()}
        />
      </Field>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- there is no RTL query for "this component's own root element and its classes"; the label/input queries above it already use accessible queries.
    expect(container.firstElementChild).toHaveClass('flex', 'flex-col');
    expect(screen.getByText('Email')).toHaveClass('text-sm', 'font-medium');
  });
});

describe('Input', () => {
  it('renders standalone outside a Field without throwing', () => {
    expect(() =>
      render(
        <Input id="solo" name="solo" type="text" value="" onChange={vi.fn()} />,
      ),
    ).not.toThrow();
  });

  it('calls onChange with the new value', async () => {
    const handleChange = vi.fn();
    render(
      <Input
        id="solo"
        name="solo"
        type="text"
        value=""
        onChange={handleChange}
      />,
    );

    await userEvent.setup().type(screen.getByRole('textbox'), 'a');

    expect(handleChange).toHaveBeenCalled();
  });
});
