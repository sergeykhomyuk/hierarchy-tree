import { memo } from 'react';
import { kitStates } from '../testing';

export const KitRoute = memo(function KitRoute() {
  return (
    <>
      {kitStates.map((entry) => (
        <section
          key={`${entry.component}-${entry.state}`}
          aria-label={`${entry.component} ${entry.state}`}
          data-kit-state={`${entry.component}-${entry.state}`}
        >
          {entry.render()}
        </section>
      ))}
    </>
  );
});
