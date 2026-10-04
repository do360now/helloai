/** Tooltip for the live counter. `carried` is true once a previous total was loaded. */
export function viewsSinceTitle(since: string, carried: boolean): string {
  const when = new Date(since).toUTCString();
  return carried
    ? `Counted since ${when}. Totals are kept when the site is redeployed`
    : `Counted since ${when}; resets when the site restarts`;
}
