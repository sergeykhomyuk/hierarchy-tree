import { memo } from 'react';

type ConfigurationErrorScreenProps = {
  invalidKeys: readonly string[];
};

// Plain markup stand-in until M4's kit ErrorState exists, which this
// swaps in then. No catalogue strings yet either (M5) - the key names
// themselves are the only content, and they are never secret (invariant 20).
const ConfigurationErrorScreen = memo(function ConfigurationErrorScreen({
  invalidKeys,
}: ConfigurationErrorScreenProps) {
  return (
    <main role="alert">
      <ul>
        {invalidKeys.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
    </main>
  );
});

export { ConfigurationErrorScreen };
export type { ConfigurationErrorScreenProps };
