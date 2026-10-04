# Worktree Cup Round 2: semver patch duel — PACKET v1.0

**Task.** `semver.py` implements Semantic Versioning 2.0.0 precedence but contains seeded defects. Fix it so it matches this spec. Judged file: **`semver.py` in the repo root of your locked commit** (the judge copies only that file into a clean directory). Python 3 standard library only; no other file is imported by the judge; do not rename or remove `parse`, `compare`, `sort_versions`. `python3 public_tests.py` shows three symptoms; the hidden bundle (about 190 cases) covers the whole spec, so read the spec and the code, not only the public checks.

## API
### `parse(version)` -> `(major, minor, patch, prerelease, build)`
* Returns a `tuple` of 5: `major`, `minor`, `patch` are `int`; `prerelease` and `build` are `tuple`s (empty if absent).
* In `prerelease`, an all-digit identifier is an `int`; any other identifier is a `str`. In `build`, every identifier is a `str` (so `"+01"` gives `("01",)`).
* `version` not a `str` (including `bytes`, `None`, `bool`, numbers): raise `TypeError`.
* A `str` that is not a valid version: raise `ValueError`.

### Grammar (SemVer 2.0.0 section 2, resolved precisely) **[R]**
`MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`, matched over the **entire** string (no leading/trailing whitespace; a trailing newline is invalid; no `v` prefix).
* `MAJOR`, `MINOR`, `PATCH`: `0` or a nonzero digit followed by digits; no leading zeros.
* `PRERELEASE`: dot-separated identifiers, each nonempty, `[0-9A-Za-z-]+`. An all-digit identifier must not have a leading zero (`0` is fine; `01` and `00` are invalid). An identifier containing any letter or hyphen may start with digits (`01a`, `0-0`, `-` are valid).
* `BUILD`: dot-separated nonempty identifiers `[0-9A-Za-z-]+`; leading zeros are allowed.
* Digits and letters are **ASCII only**: non-ASCII digits (`١`, fullwidth `１`) and letters are invalid.
* Arbitrarily large integers must work (no overflow, no length limit).

### `compare(a, b)` -> exactly `-1`, `0` or `1` (type `int`)
Parses both (errors as for `parse`, `a` first). Then SemVer section 11 precedence:
1. Compare `(major, minor, patch)` numerically.
2. If equal: a version **with** a prerelease has lower precedence than one without.
3. If both have prereleases: compare identifiers left to right. Two numeric identifiers: numerically. A numeric identifier is lower than an alphanumeric one. Two alphanumeric identifiers: by ASCII order (so `-` < digits < uppercase < lowercase; `"A" < "a"`, `"alpha" < "alphabet"`). If all shared identifiers are equal, the one with fewer identifiers is lower.
4. **Build metadata is ignored**: versions that differ only in build compare `0`.

### `sort_versions(versions)` -> `list`
`versions` is any iterable of strings (list or tuple is tested). Returns a **new list object** (even for empty input) of the same strings, ascending by `compare`, **stable** (equal-precedence strings keep input order). Must not modify its argument. If any element is invalid, raise `ValueError` (or `TypeError` for non-`str` elements) and modify nothing. If the list has both a bad value and a non-`str`, either error type is not tested.

## Hidden bundle case format (also the counterexample format)
```
{"fn":"compare","args":["1.0.0","1.0.0-rc"],"expect":{"returns":1}}
{"fn":"parse","args":["1.0.0-01"],"expect":{"raises":"ValueError"}}
{"fn":"sort_versions","args":[["2.0.0","1.0.0"]],"expect":{"returns":["1.0.0","2.0.0"]},"as_tuple":true}
```
`parse` returns are written as JSON lists `[major,minor,patch,[pre...],[build...]]` (ints stay ints, strings stay strings). `as_tuple` means the harness passes the list as a tuple. Checks apply uniformly: exact return types, exception type (`isinstance` ValueError/TypeError), argument not mutated, `sort_versions` returning a different object. Each case runs in a fresh subprocess (10 s timeout).

## Scoring (same rules as Round 1 section 4)
Per round, the hidden bundle is run on each locked commit: `passed` out of the same `total` for everyone. Rank by `(passed, validated breaks)` descending. A player's breaks = counterexamples they filed with validated=true against a non-forfeited opponent (and the filer not forfeited). Slots 3/2/1; tied players average the slots they occupy; forfeits get 0 and take no slot. A player who misses the lock forfeits. Overall place = 1 + number of players with strictly more points.

## Procedure
* **PREFLIGHT (before GO).** Clone `git clone /tmp/worktree-cup/round2/starter /tmp/worktree-cup/round2/players/<name>`; create a file `PREFLIGHT.txt`, run `python3 public_tests.py` from your clone (a python subprocess), `git add -A`, commit, and post `PREFLIGHT <name> <sha>`. GO only after all three PREFLIGHTs. The preflight commit stays in your history and is fine to build on. Do not change `semver.py` before GO.
* Build 20 minutes from GO. At lock post `LOCK <name> <full 40-hex sha>` (a commit on your clone; uncommitted work does not count). The setter posts warnings at T-5 and T-1 minutes. You may lock early; the sha you post is final.
* Counterexample window: the 10 minutes after lock. At most one per opponent, as a room post addressed to the setter containing the case JSON (format above), the expected result and the PACKET clause. It scores only if the reference matches the expectation and the opponent's locked `semver.py` does not.
* After lock, read-only review of opponents' locked commits is allowed; before lock it is forbidden. Setter-private stays unread until the reveal. Writing outside your own `/tmp/worktree-cup/round2/players/<name>` forfeits.
* Reveal: the hidden bundle tar is published after the window and must match the sha256 posted before GO.
