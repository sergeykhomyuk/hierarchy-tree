import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHttpClient } from '@platform/http';
import type { Transport } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { loadTranslations } from './loadTranslations';
import { LoginPage } from './LoginPage';
import type { LoginPageDependencies } from './LoginPage';

async function renderLoginPage(element: ReactElement): Promise<void> {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

function createSpyObservability(): ObservabilityFacade {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => 'a'.repeat(32)),
    },
    analytics: { track: vi.fn() },
  };
}

function createMapStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function createTestDependencies(
  transport: Transport = () =>
    Promise.resolve(new Response('null', { status: 200 })),
): LoginPageDependencies {
  const observability = createSpyObservability();
  const http = createHttpClient({
    transport,
    clock: createFakeClock(),
    randomness: createFakeRandomness(),
    observability,
    configuration: {
      apiBaseUrl: 'https://api.example.com',
      requestTimeoutMilliseconds: 8000,
    },
    correlationId: () => 'c'.repeat(32),
  });
  return {
    http,
    observability,
    tabStorage: createMapStorage(),
    beginInteraction: () => 'b'.repeat(32),
    navigate: vi.fn(),
  };
}

describe('LoginPage', () => {
  it('renders the empty card with the Login control absent from the tab order', async () => {
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const button = screen.getByRole('button', { name: 'login.submit' });
    expect(button).toBeDisabled();
  });

  it('enables the control once both fields are non-empty and disables it again when one empties', async () => {
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');
    const button = screen.getByRole('button', { name: 'login.submit' });

    await user.type(email, 'person@example.com');
    await user.type(password, 'hunter2');
    expect(button).toBeEnabled();

    await user.clear(password);
    expect(button).toBeDisabled();
  });

  it('leaves the control inert for a whitespace-only email', async () => {
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');
    const button = screen.getByRole('button', { name: 'login.submit' });

    await user.type(email, '   ');
    await user.type(password, 'hunter2');

    expect(button).toBeDisabled();
  });

  it('renders both fields read-only with their values while submitting', async () => {
    let resolveTransport: ((response: Response) => void) | undefined;
    const transport: Transport = () =>
      new Promise((resolve) => {
        resolveTransport = resolve;
      });
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage
        dependencies={createTestDependencies(transport)}
        destination="/"
      />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');
    const button = screen.getByRole('button', { name: 'login.submit' });

    await user.type(email, 'person@example.com');
    await user.type(password, 'hunter2');
    await user.click(button);

    expect(email).toHaveAttribute('readonly');
    expect(password).toHaveAttribute('readonly');
    expect(email).toHaveValue('person@example.com');
    expect(password).toHaveValue('hunter2');

    resolveTransport?.(new Response('null', { status: 200 }));
  });

  it('submits on Enter pressed inside either field', async () => {
    let transportCalls = 0;
    const transport: Transport = () => {
      transportCalls += 1;
      return Promise.resolve(new Response('null', { status: 200 }));
    };
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage
        dependencies={createTestDependencies(transport)}
        destination="/"
      />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'hunter2');
    await user.type(password, '{Enter}');

    expect(transportCalls).toBe(1);
  });

  it('shows the summary alert and marks both fields invalid on a null lookup', async () => {
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('login.noMatchMessage');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders no field-level message under either field', async () => {
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    await screen.findByRole('alert');
    // Exactly one alert on the page - the card-level summary - never a
    // second, per-field one.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('preserves both typed values, password included, after a failed attempt', async () => {
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    await screen.findByRole('alert');
    expect(email).toHaveValue('person@example.com');
    expect(password).toHaveValue('wrong-password');
  });

  it('moves focus nowhere when the alert appears', async () => {
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage dependencies={createTestDependencies()} destination="/" />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');
    const button = screen.getByRole('button', { name: 'login.submit' });

    await user.type(email, 'person@example.com');
    await user.type(password, 'wrong-password');
    button.focus();
    await user.click(button);

    await screen.findByRole('alert');
    // Nothing about the no-match transition unmounts the control the
    // visitor already had focused - unlike the retry path (step 21),
    // which must hand focus off explicitly because its own control is
    // removed from the DOM.
    expect(button).toHaveFocus();
  });

  it('shows the service-problem alert with its correlation id and marks neither field invalid', async () => {
    const user = userEvent.setup();
    const transport: Transport = () =>
      Promise.resolve(new Response(null, { status: 404 }));
    await renderLoginPage(
      <LoginPage
        dependencies={createTestDependencies(transport)}
        destination="/"
      />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'hunter2');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('login.serviceProblemMessage');
    expect(alert).toHaveTextContent('b'.repeat(32));
    expect(email).not.toHaveAttribute('aria-invalid');
    expect(password).not.toHaveAttribute('aria-invalid');
  });

  it('re-derives from the current field values when retry is activated', async () => {
    const user = userEvent.setup();
    const requestedPaths: string[] = [];
    const transport: Transport = (request) => {
      requestedPaths.push(new URL(request.url).pathname);
      return Promise.resolve(new Response(null, { status: 404 }));
    };
    await renderLoginPage(
      <LoginPage
        dependencies={createTestDependencies(transport)}
        destination="/"
      />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'hunter2');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));
    await screen.findByRole('alert');

    await user.clear(password);
    await user.type(password, 'a-different-password');
    await user.click(screen.getByRole('button', { name: 'login.retry' }));
    await screen.findByRole('alert');

    expect(requestedPaths).toHaveLength(2);
    expect(requestedPaths[0]).not.toBe(requestedPaths[1]);
  });

  it('hands focus to the busy Login control when the retry control unmounts', async () => {
    let resolveTransport: ((response: Response) => void) | undefined;
    let callCount = 0;
    const transport: Transport = () => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      return new Promise((resolve) => {
        resolveTransport = resolve;
      });
    };
    const user = userEvent.setup();
    await renderLoginPage(
      <LoginPage
        dependencies={createTestDependencies(transport)}
        destination="/"
      />,
    );

    const email = screen.getByLabelText('login.emailLabel');
    const password = screen.getByLabelText('login.passwordLabel');

    await user.type(email, 'person@example.com');
    await user.type(password, 'hunter2');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'login.retry' }));

    const loginButton = screen.getByRole('button', {
      name: 'login.submitting',
    });
    expect(loginButton).toHaveFocus();

    resolveTransport?.(new Response(null, { status: 404 }));
  });
});
