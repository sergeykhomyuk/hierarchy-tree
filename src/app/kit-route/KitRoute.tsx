import { kitStates } from '../testing';

export function KitRoute() {
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
}
