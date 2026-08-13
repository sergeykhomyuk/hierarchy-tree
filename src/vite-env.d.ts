/// <reference types="vite/client" />
// vitest.setup.ts's `@testing-library/jest-dom/vitest` import registers
// the matchers at runtime, but only within tools' own tsconfig project;
// this app-project reference is what makes toBeInTheDocument() etc.
// typecheck in *.test.tsx files under src.
/// <reference types="@testing-library/jest-dom/vitest" />
