import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { Transport } from '@platform/http';
import { createFakeClock, createFakeTransport } from '@shared/testing';
import type { FakeClock } from '@shared/testing';
import { loadTranslations as loadHierarchyTranslations } from '@features/hierarchy';
import { ApplicationRoot } from '../../ApplicationRoot';
import { ApplicationLayout } from '../../layout/ApplicationLayout';
import { buildTestRuntime } from '../../testing/renderRoute';
import { createHierarchyLoader } from '../createHierarchyLoader';
import { shouldRevalidateExpansionOnly } from '../shouldRevalidateExpansionOnly';
import { HomeRoute } from './HomeRoute';

function validPersonPayload(): unknown {
  return [
    {
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
    },
  ];
}

function dataResponse(): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(validPersonPayload()), { status: 200 }),
  );
}

function managerPayload(): unknown {
  return [
    {
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
    },
    {
      id: 2,
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.test',
      managerId: 1,
    },
  ];
}

function managerDataResponse(): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(managerPayload()), { status: 200 }),
  );
}

function failureResponse(): Promise<Response> {
  return Promise.resolve(new Response(null, { status: 500 }));
}

async function flushMicrotasks(times = 50): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

// GET retries once on a 5xx before fetchPeople sees a failure
// (shouldRetry.ts), and the retry delay runs against the fake clock - so a
// request that is meant to fail needs the clock advanced past it before
// the failure state renders (fetchPeople.test.ts's own precedent).
async function settleRequest(clock: FakeClock): Promise<void> {
  await flushMicrotasks();
  await clock.advance(200);
}

async function renderHomeRoute(
  transport: Transport,
  clock: FakeClock,
  initialPath = '/',
) {
  const runtime = await buildTestRuntime({}, transport, clock);
  await loadHierarchyTranslations(runtime.i18n);
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <ApplicationLayout />,
        children: [
          {
            index: true,
            shouldRevalidate: shouldRevalidateExpansionOnly,
            loader: createHierarchyLoader({
              http: runtime.http,
              observability: runtime.observability,
              interactionTracker: runtime.interactionTracker,
            }),
            element: <HomeRoute />,
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  runtime.interactionTracker.attach(router);

  render(
    <ApplicationRoot runtime={runtime}>
      <RouterProvider router={router} />
    </ApplicationRoot>,
  );
  await settleRequest(clock);

  return { runtime, router };
}

describe('HomeRoute', () => {
  it('retry mints a new correlation id and emits no route-viewed event', async () => {
    const user = userEvent.setup();
    const clock = createFakeClock();
    const transport = createFakeTransport({
      'GET /users.json': [failureResponse, failureResponse, dataResponse],
    });
    const { runtime } = await renderHomeRoute(transport, clock);
    await screen.findByRole('alert');
    const idBeforeRetry = runtime.interactionTracker.currentCorrelationId();

    const trackSpy = vi.spyOn(runtime.observability.analytics, 'track');
    await user.click(screen.getByRole('button', { name: 'page.retryLabel' }));
    await settleRequest(clock);

    expect(await screen.findByText('page.cardTitle')).toBeInTheDocument();
    const idAfterRetry = runtime.interactionTracker.currentCorrelationId();
    expect(idAfterRetry).not.toBeNull();
    expect(idAfterRetry).not.toBe(idBeforeRetry);
    expect(
      trackSpy.mock.calls.some(([name]) => name === 'app.route_viewed'),
    ).toBe(false);
  });

  it('retry after a failure that then succeeds renders the data state with the URL expansion intact', async () => {
    const user = userEvent.setup();
    const clock = createFakeClock();
    const transport = createFakeTransport({
      'GET /users.json': [failureResponse, failureResponse, dataResponse],
    });
    const { router } = await renderHomeRoute(
      transport,
      clock,
      '/?expanded=1,2,3',
    );
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'page.retryLabel' }));
    await settleRequest(clock);

    expect(await screen.findByText('page.cardTitle')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?expanded=1,2,3');
  });

  it('retry that fails again shows a different correlation id and never disables the button', async () => {
    const user = userEvent.setup();
    const clock = createFakeClock();
    const transport = createFakeTransport({
      'GET /users.json': [
        failureResponse,
        failureResponse,
        failureResponse,
        failureResponse,
        failureResponse,
        failureResponse,
      ],
    });
    const { runtime } = await renderHomeRoute(transport, clock);
    await screen.findByRole('alert');
    const firstId = runtime.interactionTracker.currentCorrelationId();

    const retryButton = () =>
      screen.getByRole('button', { name: 'page.retryLabel' });
    expect(retryButton()).not.toBeDisabled();

    await user.click(retryButton());
    await settleRequest(clock);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    const secondId = runtime.interactionTracker.currentCorrelationId();
    expect(secondId).not.toBe(firstId);
    expect(retryButton()).not.toBeDisabled();

    await user.click(retryButton());
    await settleRequest(clock);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    const thirdId = runtime.interactionTracker.currentCorrelationId();
    expect(thirdId).not.toBe(secondId);
    expect(retryButton()).not.toBeDisabled();
  });

  it('a history entry that changes the expansion fetches nothing', async () => {
    const user = userEvent.setup();
    const clock = createFakeClock();
    const responder = vi.fn(managerDataResponse);
    const transport = createFakeTransport({ 'GET /users.json': [responder] });
    const { router } = await renderHomeRoute(transport, clock);
    await screen.findByRole('tree');
    expect(responder).toHaveBeenCalledTimes(1);

    const toggle = within(
      screen.getByRole('treeitem', { name: 'Ada Lovelace' }),
    ).getByRole('button', { hidden: true });
    await user.click(toggle);

    // The toggle DOES change the URL - proof this is the real
    // useExpansion/useSearchParams path and not a click that happens to
    // fetch nothing because nothing about it touches the URL at all.
    expect(router.state.location.search).toBe('?expanded=');
    await user.click(toggle);

    expect(responder).toHaveBeenCalledTimes(1);
  });
});
