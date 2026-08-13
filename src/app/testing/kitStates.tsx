import type { ReactNode } from 'react';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
} from '@shared/ui';

export type KitState = {
  component: string;
  state: string;
  render: () => ReactNode;
};

// The closed set invariant 69 names. A completeness check (step 24)
// fails when a kit export here has no matching state.
export const KIT_COMPONENT_NAMES = [
  'Button',
  'Field',
  'Input',
  'Card',
  'Avatar',
  'Skeleton',
  'ErrorState',
  'EmptyState',
] as const;

const noop = (): void => {};

export const kitStates: readonly KitState[] = [
  {
    component: 'Button',
    state: 'primary',
    render: () => (
      <Button variant="primary" onClick={noop}>
        Kit label
      </Button>
    ),
  },
  {
    component: 'Button',
    state: 'secondary',
    render: () => (
      <Button variant="secondary" onClick={noop}>
        Kit label
      </Button>
    ),
  },
  {
    component: 'Button',
    state: 'busy',
    render: () => (
      <Button variant="primary" busy onClick={noop}>
        Kit label
      </Button>
    ),
  },
  {
    component: 'Button',
    state: 'disabled',
    render: () => (
      <Button variant="primary" disabled onClick={noop}>
        Kit label
      </Button>
    ),
  },
  {
    component: 'Field',
    state: 'default',
    render: () => (
      <Field id="kit-field-default" label="Kit label">
        <Input
          id="kit-field-default"
          name="kit-field-default"
          type="text"
          value=""
          onChange={noop}
        />
      </Field>
    ),
  },
  {
    component: 'Field',
    state: 'with hint',
    render: () => (
      <Field id="kit-field-hint" label="Kit label" hint="Kit hint">
        <Input
          id="kit-field-hint"
          name="kit-field-hint"
          type="text"
          value=""
          onChange={noop}
        />
      </Field>
    ),
  },
  {
    component: 'Field',
    state: 'with error',
    render: () => (
      <Field id="kit-field-error" label="Kit label" error="Kit error">
        <Input
          id="kit-field-error"
          name="kit-field-error"
          type="text"
          value=""
          onChange={noop}
        />
      </Field>
    ),
  },
  {
    component: 'Field',
    state: 'required',
    render: () => (
      <Field id="kit-field-required" label="Kit label" required>
        <Input
          id="kit-field-required"
          name="kit-field-required"
          type="text"
          value=""
          onChange={noop}
        />
      </Field>
    ),
  },
  {
    component: 'Input',
    state: 'standalone',
    // A raw <label> rather than Field, proving Input itself renders and
    // is accessible without FieldContext - the property its default
    // context value exists for.
    render: () => (
      <label htmlFor="kit-input">
        Kit label
        <Input
          id="kit-input"
          name="kit-input"
          type="text"
          value=""
          onChange={noop}
        />
      </label>
    ),
  },
  {
    component: 'Card',
    state: 'comfortable',
    render: () => <Card padding="comfortable">Kit card content</Card>,
  },
  {
    component: 'Card',
    state: 'compact',
    render: () => <Card padding="compact">Kit card content</Card>,
  },
  {
    component: 'Avatar',
    state: 'with image',
    render: () => (
      <Avatar
        imageSource="https://example.com/kit-avatar.jpg"
        displayName="Kit Person"
        size="medium"
        decorative={false}
      />
    ),
  },
  {
    component: 'Avatar',
    state: 'initials fallback',
    render: () => (
      <Avatar displayName="Kit Person" size="medium" decorative={false} />
    ),
  },
  {
    component: 'Avatar',
    state: 'decorative',
    render: () => <Avatar displayName="Kit Person" size="small" decorative />,
  },
  {
    component: 'Skeleton',
    state: 'text',
    render: () => <Skeleton shape="text" width="line" height="line" />,
  },
  {
    component: 'Skeleton',
    state: 'circle',
    render: () => <Skeleton shape="circle" width="avatar" height="avatar" />,
  },
  {
    component: 'Skeleton',
    state: 'block',
    render: () => <Skeleton shape="block" width="card" height="card" />,
  },
  {
    component: 'ErrorState',
    state: 'default',
    render: () => (
      <ErrorState title="Kit error title" message="Kit error message" />
    ),
  },
  {
    component: 'ErrorState',
    state: 'with action',
    render: () => (
      <ErrorState
        title="Kit error title"
        message="Kit error message"
        correlationId="kit-correlation-id"
        action={{ label: 'Kit retry', onActivate: noop }}
      />
    ),
  },
  {
    component: 'EmptyState',
    state: 'default',
    render: () => (
      <EmptyState title="Kit empty title" message="Kit empty message" />
    ),
  },
  {
    component: 'EmptyState',
    state: 'with action',
    render: () => (
      <EmptyState
        title="Kit empty title"
        message="Kit empty message"
        action={{ label: 'Kit add', onActivate: noop }}
      />
    ),
  },
];
