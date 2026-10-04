# Worktree Cup Round 3: exact calculator — PACKET v1.0

**Task.** Implement `calc.py` (repo root; the stub is provided): an evaluator for arithmetic expressions with **exact rational** results, precise error categories and explicit resource bounds. Python 3 standard library only. The judge copies only `calc.py` from your locked commit into a clean directory. Do not rename `evaluate` or `ExprError`.

## API
* `calc.evaluate(expr)` -> `str`. Returns the exact value in canonical text (below).
* `calc.ExprError(Exception)`; instances have a `kind` attribute, one of `"syntax"`, `"zero_div"`, `"domain"`, `"limit"`. (It need not subclass any other exception type.)
* `expr` not a `str` (`None`, numbers, `bytes`, lists...): raise `TypeError` (not `ExprError`). This is checked first.

## Language
Tokens: unsigned decimal integers `[0-9]+` (ASCII digits; leading zeros allowed: `007` is 7); unsigned decimals `[0-9]+\.[0-9]+` (digits on both sides of the dot; exact: `0.1` is exactly 1/10, `2.50` is 5/2); operators `+ - * / // % **`; parentheses. Spaces and tabs are allowed between any two tokens and at the start/end, never inside a token (`1 . 5`, `* *` are syntax errors). Anything else is a syntax error: newlines and other whitespace, letters, `1.`, `.5`, `1e3`, `_`, non-ASCII digits, commas, empty or whitespace-only input.

Grammar (lowest to highest precedence; all binary operators left-associative except `**`):
```
expr   := term (('+' | '-') term)*
term   := unary (('*' | '/' | '//' | '%') unary)*
unary  := ('-' | '+') unary | power
power  := atom ['**' unary]
atom   := NUMBER | '(' expr ')'
```
So `-2**2` is `-(2**2)` = -4, `2**-2` is 1/4, `2**3**2` is `2**(3**2)` = 512, `2**-2**2` is `2**(-(2**2))`, `1/2//1/4` is `((1/2)//1)/4`. Unary `+`/`-` may be chained (`--1`, `+-+1`).

## Values and operators
All values are exact rationals (no floating point anywhere).
* `+ - *`, `/` (exact division) behave as usual.
* `a // b` is `floor(a / b)` (an integer); `a % b` is `a - b * (a // b)` (so it has the sign of `b`; operands may be non-integers: `7.5 // 2` = 3, `7.5 % 2` = 3/2, `-7 // 2` = -4, `7 % -3` = -2).
* `a ** b`: `b` must be an integer-valued rational (`2**2.0` is fine, `2**(4/2)` is fine); otherwise **domain** error. Negative exponents give reciprocals (`(2/3)**-2` = 9/4). `0**0` = 1.
* **Canonical output:** an integer value as its decimal digits with `-` if negative (`0` never has a sign); a non-integer as `p/q` in lowest terms, `q > 1`, sign on `p` only (`-1/2`). No spaces, no decimal points. Results may have many digits (see bounds); Python's default 4300-digit string-conversion limit does NOT apply to this spec.

## Errors
Category meanings:
* `syntax`: the input does not match the language above.
* `zero_div`: `/`, `//` or `%` with a zero right operand; or `0` raised to a negative power.
* `domain`: `**` with a non-integer exponent (even for bases like 0, 1, 4).
* `limit`: a bound below is exceeded.

**Precedence of errors (all deterministic):**
1. Non-`str` input: `TypeError`.
2. `len(expr) > 1000` (code points): `limit` — before any other check, including syntax.
3. The whole expression is parsed first: any syntax error is reported before any evaluation error, wherever it appears.
4. Evaluation is depth-first, **left operand before right operand** (for `**`: base before exponent); an error raised while evaluating an operand propagates before the operator's own checks. The first error in this order is the one raised (`1/0 + 2**0.5` is `zero_div`; `2**0.5 + 1/0` is `domain`).
5. Within one `**`, after both operands: domain (non-integer exponent), then zero_div (base 0, exponent < 0), then limit (pow bound), then the result-size check.

## Bounds (part of the spec; performance is tested)
Let `size(x)` for a rational `x` = `max(bit_length(|numerator|), bit_length(denominator))` of the fully reduced fraction, where `bit_length(0) = 0` (so `size(0)` = 1 because the denominator is 1, `size(1)` = 1, `size(2/3)` = 2, `size(10**999)` = 3322).
* **Length:** expressions are at most 1000 characters; a longer one is `limit`. Every expression of at most 1000 characters must be evaluated correctly, including nesting depth up to 499 parentheses, a unary chain of 999 signs and `**` chains of 333 operators. No `RecursionError` or other crash is acceptable.
* **Power bound:** for `a ** e` (after domain and zero_div checks): if `|e| * size(a) > 200000` then `limit`. (So `2**100000` works, `2**100001` is `limit`; `1**200001` and `0**200001` are `limit`; `3**100000` works; `4**66666` works, `4**66667` is `limit`.) The bound applies to the exact integer exponent however large it is.
* **Result size:** after every binary operation (`+ - * / // % **`), if `size(result) > 400000` raise `limit`. This applies to intermediate results too, even if a later operation would shrink the value (`2**100000*2**100000*2**100000*2**100000/2**100000` is `limit`, since the intermediate `2**400000` has 400001 bits). Literals, unary signs and parentheses add no check.
* **Time:** every case runs in a fresh subprocess with a 10 s timeout; a case that times out fails. All inputs that satisfy the bounds above are expected to finish well inside it (the reference takes under 1.5 s on the largest). Evaluation of a bounded input must not need more than ordinary big-integer arithmetic.

## Hidden bundle and counterexample format
About 600 cases (hand-written plus differentially-fuzzed). A case, also the counterexample format:
```
{"expr": "-2**2", "expect": {"returns": "-4"}}
{"expr": "1/0", "expect": {"raises": "zero_div"}}
{"expr": null, "expect": {"raises": "TypeError"}}
{"expr": "2**100000+3**60000", "expect": {"returns_sha256": "<hex sha256 of the UTF-8 bytes of the expected string>"}}
```
Optional `"as_bytes": true` passes `expr.encode()` instead of the string. A case passes iff the call returns exactly the expected string (type `str`), or raises `ExprError` with exactly that `kind`, or raises `TypeError` for `TypeError`; any other exception, wrong type, wrong value or timeout fails. A counterexample may use `returns_sha256` for long results. Counterexample expressions larger than 1000 characters are allowed only to test `limit`.

## Scoring (same as Rounds 1 and 2)
The hidden bundle is run on each locked commit: `passed` of the same `total`. Rank by `(passed, validated breaks)` descending; a validated break is your counterexample that the reference passes and the target's locked `calc.py` fails (filer and target both non-forfeited). Slots 3/2/1, ties average, forfeits 0. Overall place = 1 + number of players with strictly more points.

## Procedure
* **PREFLIGHT before GO:** clone `git clone /tmp/worktree-cup/round3/starter /tmp/worktree-cup/round3/players/<name>`; create `PREFLIGHT.txt`; run `python3 public_tests.py` (a python subprocess; it is expected to FAIL on the stub); `git add -A`; commit; post `PREFLIGHT <name> <sha>`. Don't change `calc.py` before GO.
* **Build:** 25 minutes from GO. Post `LOCK <name> <40-hex sha>` (a commit in your clone) by the lock time; a missing lock is a forfeit. Early lock is allowed and final.
* **Counterexample window:** opens as soon as all three have locked (or at the lock time), closes at lock time + 10 minutes (UTC time stated in the GO post). At most one counterexample per opponent, addressed to the setter, with the case JSON, the expected result and the PACKET clause. After you lock you may read the others' locked commits (read-only); before your own lock you may not.
* **Out of bounds:** setter-private; writing outside your own `/tmp/worktree-cup/round3/players/<name>`.
* **Reveal:** the bundle is published after the window and must match the sha256 posted before GO. The setter has validated the reference with an independent oracle (see the reveal).
