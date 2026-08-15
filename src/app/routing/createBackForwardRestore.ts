export type RevalidatableRouter = {
  revalidate: () => Promise<void> | void;
};

// A same-document Back after sign-out re-runs the router's loaders and
// lands on the login page; a bfcache restore does not - the JS heap comes
// back with the authenticated view already rendered and no loader re-run.
// `pageshow` is the earliest hook a restored document offers, so
// revalidation necessarily runs AFTER the browser hands the restored
// document back: a restored frame of authenticated content can be on
// screen for the interval between restore and the guard's redirect. No
// client-side mechanism closes that interval (invariant 103).
export function createBackForwardRestore(
  router: RevalidatableRouter,
): () => void {
  function handlePageShow(event: PageTransitionEvent): void {
    if (event.persisted) {
      void router.revalidate();
    }
  }

  window.addEventListener('pageshow', handlePageShow);
  return () => window.removeEventListener('pageshow', handlePageShow);
}
