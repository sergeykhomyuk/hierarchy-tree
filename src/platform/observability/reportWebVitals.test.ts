import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeMetric = { name: 'LCP' | 'INP' | 'CLS'; value: number };
type OnReportRegistration = (onReport: (metric: FakeMetric) => void) => void;

const { onLCPMock, onINPMock, onCLSMock } = vi.hoisted(() => ({
  onLCPMock: vi.fn<OnReportRegistration>(),
  onINPMock: vi.fn<OnReportRegistration>(),
  onCLSMock: vi.fn<OnReportRegistration>(),
}));

vi.mock('web-vitals', () => ({
  onLCP: onLCPMock,
  onINP: onINPMock,
  onCLS: onCLSMock,
}));

import { reportWebVitals } from './reportWebVitals';

describe('reportWebVitals', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    onLCPMock.mockClear();
    onINPMock.mockClear();
    onCLSMock.mockClear();
  });

  it('each web vital is reported once through the facade with its passed value', () => {
    vi.stubGlobal('PerformanceObserver', class {});
    const track = vi.fn();

    reportWebVitals({ track });

    expect(onLCPMock).toHaveBeenCalledTimes(1);
    expect(onINPMock).toHaveBeenCalledTimes(1);
    expect(onCLSMock).toHaveBeenCalledTimes(1);

    onLCPMock.mock.calls[0]?.[0]({ name: 'LCP', value: 123 });
    onINPMock.mock.calls[0]?.[0]({ name: 'INP', value: 45 });
    onCLSMock.mock.calls[0]?.[0]({ name: 'CLS', value: 0.1 });

    expect(track).toHaveBeenCalledTimes(3);
    expect(track).toHaveBeenCalledWith('app.web_vital', {
      metric: 'LCP',
      value: 123,
    });
    expect(track).toHaveBeenCalledWith('app.web_vital', {
      metric: 'INP',
      value: 45,
    });
    expect(track).toHaveBeenCalledWith('app.web_vital', {
      metric: 'CLS',
      value: 0.1,
    });
  });

  it('an unsupported observer produces no throw no event and no console call', () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    const track = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => reportWebVitals({ track })).not.toThrow();

    expect(track).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(onLCPMock).not.toHaveBeenCalled();
  });

  it('degrades silently when a registration throws', () => {
    vi.stubGlobal('PerformanceObserver', class {});
    onLCPMock.mockImplementationOnce(() => {
      throw new Error('unsupported entry type');
    });
    const track = vi.fn();

    expect(() => reportWebVitals({ track })).not.toThrow();
    expect(track).not.toHaveBeenCalled();
  });
});
