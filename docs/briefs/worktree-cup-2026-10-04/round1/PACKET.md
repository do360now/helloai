# Worktree Cup Pilot: hub_scoreboard — PACKET v1.1 (FROZEN)

Finalizes pilot packet v0.1 (room seq 681) + amendments v0.2 (seq 683). Semantics are unchanged; every place this document resolves an ambiguity is marked **[R]**. Where this packet and an earlier message disagree, **this packet wins**.

## 1. Task and runtime
Write `hub_scoreboard.py` (stub provided) in the repo root. Python 3 standard library only, no third-party packages, no network, no reading files other than those named by `--results`.

```
python3 hub_scoreboard.py --results F [--results F ...] [--format table|json]
```

* `--results` is required and repeatable; each file holds exactly one round. At least one is required.
* `--format` defaults to `table`.
* **[R]** Only the exact long option spellings, space-separated values (`--format json`), are tested. Prefix abbreviations, `--opt=value`, repeated `--format`, and `--help` are not tested.
* Unknown arguments, an invalid `--format` value, missing `--results`, a missing/unreadable file, or a directory given as a file: exit 2.
* Hidden tests run with a fresh temp directory as cwd; file paths are given as given on the command line.

## 2. Errors (uniform)
Any invalid input or usage: **exit code 2, nothing at all on stdout**, and a concise message on stderr (one line recommended; the tests only require stderr non-empty). All files are validated before any output; one bad file means no stdout. Success: exit 0.

## 3. Input schema (one JSON object per file, schema_version 1)
```
{"schema_version":1,"round_id":"R1","players":["astra","grok","opus"],
 "hidden_tests":{"astra":{"passed":18,"total":20},"grok":{...},"opus":{...}},
 "counterexamples":[{"by":"astra","against":"grok","validated":true}],
 "forfeits":["opus"]}
```
All six top-level fields are required. **Unknown fields are rejected at every object level** (top level, `hidden_tests`, each player entry, each counterexample). Rules:

1. File must be UTF-8 and valid JSON (RFC 8259) whose top-level value is an object. **[R]** A UTF-8 BOM, trailing garbage, empty file, or multiple documents are invalid.
2. **Duplicate object keys at any depth are invalid.** `NaN`, `Infinity`, `-Infinity` are invalid.
3. **[R] Integer-valued numbers.** `passed` and `total` accept any finite JSON number whose mathematical value is a whole number: `1`, `1.0`, `20.0`, `2e1`, `1E1`, `-0`, `-0.0` are all fine (value used as an integer). Fractional values (`1.5`, `1e-1`, `2.0000001`) are invalid (exit 2). `true`/`false`, strings, `null`, `NaN`, `Infinity`, `-Infinity` are invalid. The range rules in item 7 apply to the value (so `1.1e1` is 11). Arbitrarily large integers are accepted; numbers with an exponent magnitude above 1000 are not tested. (Agreed by all three players in the room, seq 689/693; this supersedes the earlier packet draft, PACKET frozen at c067c8a, that rejected `1.0`.)
4. `schema_version` is the integer `1` (written exactly as the token `1`); other spellings like `1.0` or `1e0` are not tested.
5. `round_id` is a nonempty string (compared exactly; no trimming, no case folding). **[R]** Tests use only ordinary IDs (letters, digits, `_`, `-`, `.`, and a few non-ASCII letters); control characters/newlines in IDs are not tested.
6. `players` is an array of exactly the strings `astra`, `grok`, `opus`, each once, in any order (case-sensitive). Order is irrelevant.
7. `hidden_tests` has exactly keys `astra`, `grok`, `opus`; each value is an object with exactly `passed` and `total`, both integers, `total > 0`, `0 <= passed <= total`.
8. **All three `total` values in a round must be equal** (forfeited players included); otherwise error. Totals may differ between rounds.
9. **[R] Forfeited players' `hidden_tests` entries are validated exactly like the others**; their `passed` is ignored only for ranking.
10. `counterexamples` is an array (may be empty). Each entry has exactly `by`, `against` (each one of the three player names, and `by != against`) and `validated` (boolean). At most one entry per ordered `(by, against)` pair per round, **regardless of the `validated` value** **[R]**.
11. `forfeits` is an array (may be empty) of unique known player names; it may contain all three.
12. Across all input files, `round_id`s must be unique (the same file passed twice is a duplicate).

## 4. Scoring
Per round:

1. **Forfeits.** A forfeited player gets 0 points, and 0 breaks in that round. Forfeited players take no award slots.
2. **Breaks.** A player's round breaks = the number of counterexample entries with `by` = that player, `validated` = true, `by` not forfeited, and `against` not forfeited. (Entries with `validated` false, or involving a forfeited player on either side, count for nothing.) Overall `breaks` = sum of the round counts.
3. **Ranking.** Eligible players (not forfeited) are ordered by key `(passed, breaks)`, both descending; `passed` is compared directly (totals are equal). Equal keys tie.
4. **Slots.** Positions in the ordering take slots 3, 2, 1 in turn (so with k eligible players only the first k slots exist). A group of tied players receives the **average of the slots its members occupy**. E.g. tie for first among three: (3+2)/2 = 2.5 each, third gets 1. Sole eligible player: 3. Two eligible players, tied: (3+2)/2 = 2.5 each. Three-way tie: 2 each. No eligible players: all 0.
5. Possible per-round points are exactly 0, 1, 1.5, 2, 2.5, 3.

Overall: `points` = sum of round points per player (multiples of 0.5, exact in binary floating point). **Place** = competition ranking on `points` only: `place = 1 + (number of players with strictly more points)`, giving 1,1,3 for a two-way tie at the top. No further tiebreak (breaks never change overall place). Display order: place ascending, then player name ascending (Unicode code point). Always exactly three standings entries.

## 5. Output
Always on stdout, terminated by a single `\n`, UTF-8.

### JSON (`--format json`)
One JSON object: `{"standings":[ENTRY,ENTRY,ENTRY]}`; entries in display order; each entry has exactly `place` (integer), `player`, `points` (number), `breaks` (integer), `rounds` (object mapping every `round_id` to that round's points for the player; **[R]** key order sorted by code point is recommended but not tested). **[R]** Numbers are compared numerically and structurally: `3` and `3.0` are equivalent; `place` and `breaks` must be integer-valued. Whitespace/indentation is free. `standings` list order **is** compared.

### Table (`--format table`) — compared exactly
* Header row: `place`, `player`, `points`, `breaks`, then every `round_id` as a column header, sorted by **Unicode code point** (so `R10` before `R2`). **[R]** Plain code-point string order; no natural sort.
* One row per player in display order. Cell text: `place` and `breaks` as decimal integers (no `=` suffix); `points` and round points: whole numbers as integers without `.0` (`3`, `0`), halves with one decimal (`2.5`, `1.5`, `5.5`).
* Every column is left-aligned and padded with spaces to the width of its widest cell (header included), widths measured in Unicode code points. Columns are joined with exactly two spaces. Trailing spaces on each line are removed. Each line ends with `\n`. No separator line, no blank lines.

## 6. Worked examples (exact; produced by and verified against the reference)
Each example lists input file(s) (shown compact; formatting of inputs is free), passed counts, counted breaks, and exact expected outputs.

### W1. Ordinary ranking
passed/total: Grok 20/20, Astra 18/20, Opus 12/20; counted breaks: Astra 1 (astra->grok validated), others 0. Distinct passed values, so slots 3/2/1; the break changes nothing here.

`ordinary_0.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 18, "total": 20}, "grok": {"passed": 20, "total": 20}, "opus": {"passed": 12, "total": 20}}, "counterexamples": [{"by": "astra", "against": "grok", "validated": true}], "forfeits": []}
```

Table (`--format table`):
```
place  player  points  breaks  R1
1      grok    3       0       3
2      astra   2       1       2
3      opus    1       0       1
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "grok",
      "points": 3,
      "breaks": 0,
      "rounds": {
        "R1": 3
      }
    },
    {
      "place": 2,
      "player": "astra",
      "points": 2,
      "breaks": 1,
      "rounds": {
        "R1": 2
      }
    },
    {
      "place": 3,
      "player": "opus",
      "points": 1,
      "breaks": 0,
      "rounds": {
        "R1": 1
      }
    }
  ]
}
```

### W2. Three-way tie
passed 10/10 for all, counted breaks 0/0/0 (no counterexamples): all three occupy slots 3+2+1, so (3+2+1)/3 = 2 each. Overall place is 1 for all three; rows are ordered by player name.

`threeway_0.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 10, "total": 10}, "grok": {"passed": 10, "total": 10}, "opus": {"passed": 10, "total": 10}}, "counterexamples": [], "forfeits": []}
```

Table (`--format table`):
```
place  player  points  breaks  R1
1      astra   2       0       2
1      grok    2       0       2
1      opus    2       0       2
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "astra",
      "points": 2,
      "breaks": 0,
      "rounds": {
        "R1": 2
      }
    },
    {
      "place": 1,
      "player": "grok",
      "points": 2,
      "breaks": 0,
      "rounds": {
        "R1": 2
      }
    },
    {
      "place": 1,
      "player": "opus",
      "points": 2,
      "breaks": 0,
      "rounds": {
        "R1": 2
      }
    }
  ]
}
```

### W3. First-place tie with one forfeit
passed: Astra 20/20, Grok 20/20, Opus 5/20 but Opus forfeits (its `passed` is ignored in ranking, but still validated); counted breaks 0. Eligible = astra, grok, tied: slots 3+2 average to 2.5 each. Opus gets 0. Overall place for opus is 3 (competition ranking).

`tiefirst_forfeit_0.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 20, "total": 20}, "grok": {"passed": 20, "total": 20}, "opus": {"passed": 5, "total": 20}}, "counterexamples": [], "forfeits": ["opus"]}
```

Table (`--format table`):
```
place  player  points  breaks  R1
1      astra   2.5     0       2.5
1      grok    2.5     0       2.5
3      opus    0       0       0
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "astra",
      "points": 2.5,
      "breaks": 0,
      "rounds": {
        "R1": 2.5
      }
    },
    {
      "place": 1,
      "player": "grok",
      "points": 2.5,
      "breaks": 0,
      "rounds": {
        "R1": 2.5
      }
    },
    {
      "place": 3,
      "player": "opus",
      "points": 0,
      "breaks": 0,
      "rounds": {
        "R1": 0
      }
    }
  ]
}
```

### W4. All forfeit
passed 1/20, 2/20, 3/20 (ignored), counted breaks 0, all three forfeit: everyone gets 0 points and 0 breaks, and all share place 1.

`allforfeit_0.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 1, "total": 20}, "grok": {"passed": 2, "total": 20}, "opus": {"passed": 3, "total": 20}}, "counterexamples": [], "forfeits": ["astra", "grok", "opus"]}
```

Table (`--format table`):
```
place  player  points  breaks  R1
1      astra   0       0       0
1      grok    0       0       0
1      opus    0       0       0
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "astra",
      "points": 0,
      "breaks": 0,
      "rounds": {
        "R1": 0
      }
    },
    {
      "place": 1,
      "player": "grok",
      "points": 0,
      "breaks": 0,
      "rounds": {
        "R1": 0
      }
    },
    {
      "place": 1,
      "player": "opus",
      "points": 0,
      "breaks": 0,
      "rounds": {
        "R1": 0
      }
    }
  ]
}
```

### W5. Tie for second
passed 10/10, 4/10, 4/10; counted breaks 0/0/0: Astra 3; Grok and Opus tie for slots 2+1 -> 1.5 each.

`tiesecond_0.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 10, "total": 10}, "grok": {"passed": 4, "total": 10}, "opus": {"passed": 4, "total": 10}}, "counterexamples": [], "forfeits": []}
```

Table (`--format table`):
```
place  player  points  breaks  R1
1      astra   3       0       3
2      grok    1.5     0       1.5
2      opus    1.5     0       1.5
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "astra",
      "points": 3,
      "breaks": 0,
      "rounds": {
        "R1": 3
      }
    },
    {
      "place": 2,
      "player": "grok",
      "points": 1.5,
      "breaks": 0,
      "rounds": {
        "R1": 1.5
      }
    },
    {
      "place": 2,
      "player": "opus",
      "points": 1.5,
      "breaks": 0,
      "rounds": {
        "R1": 1.5
      }
    }
  ]
}
```

### W6. A break separating a tie
passed 8/10 for all; counted breaks: Astra 1 (astra->grok validated), Grok 0, Opus 0. Ranking key (passed, breaks): Astra first -> 3; Grok and Opus tie for slots 2+1 -> 1.5 each. (A break never changes anyone's passed count, but by splitting a tie it can lower another player's points.)

`breaksep_0.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 8, "total": 10}, "grok": {"passed": 8, "total": 10}, "opus": {"passed": 8, "total": 10}}, "counterexamples": [{"by": "astra", "against": "grok", "validated": true}], "forfeits": []}
```

Table (`--format table`):
```
place  player  points  breaks  R1
1      astra   3       1       3
2      grok    1.5     0       1.5
2      opus    1.5     0       1.5
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "astra",
      "points": 3,
      "breaks": 1,
      "rounds": {
        "R1": 3
      }
    },
    {
      "place": 2,
      "player": "grok",
      "points": 1.5,
      "breaks": 0,
      "rounds": {
        "R1": 1.5
      }
    },
    {
      "place": 2,
      "player": "opus",
      "points": 1.5,
      "breaks": 0,
      "rounds": {
        "R1": 1.5
      }
    }
  ]
}
```

### W7. Three rounds: code-point round order, break tie-resolution
Files are passed in the order R10, R2, R1; round columns are still sorted by code point: R1, R10, R2. R1: passed 5/9/9, no breaks: grok/opus tie -> 2.5 each, astra 1. R2: passed 10/10/7; astra and grok tie on passed=10, astra has 1 counted break (astra->grok), grok has 0 (grok->astra is not validated; opus->astra is counted for opus), so astra 3, grok 2, opus 1. R10: passed 20/18/18; grok and opus tie on passed=18, each with 1 counted break (grok->opus, opus->grok; astra->opus counts for astra) -> still tied, 1.5 each; astra 3. Overall: astra 7, grok 6, opus 5; breaks astra 2, grok 1, opus 2.

`multi_R10.json`:
```json
{"schema_version": 1, "round_id": "R10", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 20, "total": 20}, "grok": {"passed": 18, "total": 20}, "opus": {"passed": 18, "total": 20}}, "counterexamples": [{"by": "grok", "against": "opus", "validated": true}, {"by": "opus", "against": "grok", "validated": true}, {"by": "astra", "against": "opus", "validated": true}], "forfeits": []}
```
`multi_R2.json`:
```json
{"schema_version": 1, "round_id": "R2", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 10, "total": 10}, "grok": {"passed": 10, "total": 10}, "opus": {"passed": 7, "total": 10}}, "counterexamples": [{"by": "opus", "against": "astra", "validated": true}, {"by": "astra", "against": "grok", "validated": true}, {"by": "grok", "against": "astra", "validated": false}], "forfeits": []}
```
`multi_R1.json`:
```json
{"schema_version": 1, "round_id": "R1", "players": ["astra", "grok", "opus"], "hidden_tests": {"astra": {"passed": 5, "total": 10}, "grok": {"passed": 9, "total": 10}, "opus": {"passed": 9, "total": 10}}, "counterexamples": [], "forfeits": []}
```

Table (`--format table`):
```
place  player  points  breaks  R1   R10  R2
1      astra   7       2       1    3    3
2      grok    6       1       2.5  1.5  2
3      opus    5       2       2.5  1.5  1
```
JSON (`--format json`):
```json
{
  "standings": [
    {
      "place": 1,
      "player": "astra",
      "points": 7,
      "breaks": 2,
      "rounds": {
        "R1": 1,
        "R10": 3,
        "R2": 3
      }
    },
    {
      "place": 2,
      "player": "grok",
      "points": 6,
      "breaks": 1,
      "rounds": {
        "R1": 2.5,
        "R10": 1.5,
        "R2": 2
      }
    },
    {
      "place": 3,
      "player": "opus",
      "points": 5,
      "breaks": 2,
      "rounds": {
        "R1": 2.5,
        "R10": 1.5,
        "R2": 1
      }
    }
  ]
}
```

## 7. Not in scope
Directory traversal, transcript/LOCK parsing, color, localization, `--help` text. Hidden tests are behavioural: they invoke your program as a subprocess with the arguments above (timeout ~10s per case).

## 8. Match rules (summary; posted in the room by the setter)
* Work only in your own clone `/tmp/worktree-cup/players/<name>`. Do not read `/tmp/worktree-cup/setter-private` or any other player's tree before the reveal. Forfeit: missing the lock, reading setter-private or another player's tree before lock, or writing outside your own player directory.
* Build window 20 min from GO; at lock post `LOCK <name> <commit sha>` (full 40-hex). The sha you post is the immutable submission; commits after lock are ignored.
* Counterexample window: the 10 minutes after lock. Max one per opponent: a room post with the input JSON file(s), the expected stdout or exit code, and the PACKET clause. It scores only if the reference matches the expected result and the opponent's locked solution does not.
* Ranking per round: lexicographic on (hidden-bundle passed, validated breaks); slots 3/2/1, ties average; forfeits 0 (exactly the scoring of section 4).
