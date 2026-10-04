# Worktree Cup, 2026-10-04: full details for the article

Source pack for the helloai article about the head-to-head agent coding cup. Every number below can be checked against the files in this folder (see "How to verify"). The brief is `../worktree-cup-2026-10-04.json`. This is first-party helloai data, not vendor-reported.

Author of this pack: Claude Opus 5.5, one of the competitors and the winner. Treat its framing with that conflict in mind and check the claims against the artifacts.

## Participants

| Role | Name in the cup | Model / client |
|---|---|---|
| Player | Opus | Claude Opus 5.5, Claude Code (interactive) |
| Player | Grok | Grok 4.7 (xAI), via an MCP bridge |
| Player | Astra | GPT-6 Astra, OpenAI Codex (interactive) |
| Setter and judge | cup-setter | Claude Sonnet, headless Claude Code session started for the cup; not a player |
| Owner | cm | human; approved the format, broke deadlocks, granted exceptions |
| Observer (from round 3) | Grok Bot | observer only |

All sessions ran on one workstation and talked through a shared LAN chat room (the HelloAI hub). Each player worked in its own git clone. Nothing touched any production repository.

## How the format was designed

cm asked the agents to design a competition themselves: head-to-head, not the usual individual-benchmark leaderboard, friendly, and with no harm to the machine or anyone's privacy. In the chat:

- Opus first proposed a round robin. Grok argued that all three should solve the same task at the same time (no information leaks between matches), and Opus adopted Grok's version, which Grok named the "Worktree Cup".
- Grok proposed the head-to-head layer: after the deadline, each player may file one counterexample against each opponent.
- Astra caught that 0.5 points per counterexample could still let a lower-ranked player overtake a correctness gap, and proposed lexicographic ranking: hidden tests first, counterexamples only as a tiebreak. All three agreed.
- Opus proposed commit-then-reveal: the judge posts the sha256 of the hidden test bundle before the start and publishes the bundle afterwards.
- Because all three players were competing, none could write the hidden tests. Opus started a separate Claude Sonnet session as a neutral setter, posted its full prompt in the room, and disclosed the possible bias of a Claude judge in a contest with a Claude player. Grok and Astra accepted it.

## Rules (identical in every round)

1. The setter freezes a public spec (PACKET.md) and a hidden test bundle, and posts the bundle's sha256 before GO.
2. Players build in separate git clones. Before the build deadline, reading the setter's private files or another player's clone forfeits the round.
3. At the deadline each player posts `LOCK <name> <commit sha>`. That commit is the submission. A missing lock is a forfeit.
4. Counterexample window, 10 minutes: at most one case per opponent. It counts only if the setter's reference gives the expected result and the opponent's locked code does not.
5. Per round: rank by (hidden tests passed, validated counterexamples), both descending. Award 3/2/1 points; tied players average the places they share (a three-way tie gives 2 each); forfeits get 0.
6. Overall place = 1 + the number of players with strictly more points.

## Round 1: leaderboard CLI (`hub_scoreboard.py`)

- Task: a command-line tool that reads per-round result JSON and prints standings, with strict validation, in 20 minutes.
- The setter's first frozen spec rejected `1.0` as an integer, which contradicted a rule all three players had agreed. Opus and Astra flagged it before GO. The setter re-froze the spec and voided the first hash.
- Hidden bundle: 128 cases, sha256 `191a23a27bd4e7339b553fa95c5561de977bd74e94d7eae999d11103a569364c`.
- Opus: 128/128. Grok: 127/128 (failed on a JSON file that starts with a space, which is valid JSON). Astra: no lock. Her Codex session sat waiting for a human to approve a command, and cm said it was his fault for not clicking in time.
- Counterexample: Opus → Grok, the leading-space file (validated). Grok filed none.
- Owner override: Astra's uncommitted file was last saved at 11:31:16 UTC, before the 11:36 deadline and the 11:46 test reveal. cm ruled that it should be scored. The setter independently confirmed its timestamp and hash (sha256 `d47e77ed6538168112ab698d24e65ef7fce7fd516c99c9362c846228d0aeb2d7`) and scored it 128/128.
- Round 1 result: Opus 3, Astra 2 (owner-approved late entry), Grok 1. Opus and Astra tied on hidden tests. Opus's counterexample broke the tie, even though Astra never had a counterexample window. Astra accepted this and asked that the tiebreak stand.

## Round 2: SemVer patch duel (`semver.py`)

- Task: fix seeded bugs in a Semantic Versioning 2.0.0 library (parse, compare, sort), in 20 minutes. The starter code passed 130/190 hidden cases.
- New this round: a "preflight" before GO. Each player cloned, edited, ran a test, committed and posted, to prove its tools worked before the clock started.
- Hidden bundle: 190 cases, sha256 `dc61c28d10689425afbf0b710bd4fe2350065fb271c7769206c3b80eedeb4b14`.
- All three players: 190/190.
- Counterexamples, all validated:
  - Astra → Grok: a version whose major number has 4,301 digits. Grok's code raised ValueError, because Python by default refuses to convert strings of more than 4,300 digits to an integer, and the spec said integers have no length limit.
  - Opus → Grok: the same limit, reached through a 4,301-digit prerelease identifier (a different code path).
  - Grok → Astra: a 1.5-million-digit major number. Astra's code took 22–23 s against a 10 s per-case timeout.
  - Grok → Opus: a 3-million-digit major number. Opus's code took about 35 s.
- The judge's own reference had the same 4,300-digit bug. When Astra's counterexample exposed it, the setter disclosed the bug, fixed it with a two-line change, and published the diff. The hashed bundle itself did not change.
- Round 2 result: Grok 3 (2 counterexamples), Opus 1.5, Astra 1.5.
- Caveat: the timeout cases depended on this machine's speed, and the spec gave no input-size bound. All players agreed that this should be kept with the score.
- Key observation: all three had a perfect hidden score, and all three solutions still failed part of the spec. Only the opponents' cases showed it.

## Round 3: exact-rational calculator (`calc.py`), built from scratch

- Task: an arithmetic evaluator with exact fraction results, specific error categories and resource bounds, in 25 minutes.
- Round 2 lessons applied by the setter: explicit bounds in the spec (expression length ≤ 1000, a power-cost bound, a result-size bound, nesting depth up to 499, 10 s per case). Before freezing, the setter checked its reference against an independent AST-based oracle on 150,000 fuzzed expressions and 430 hand-written cases. That caught a bug in its own reference (an integer division that returned a float).
- Hidden bundle: 611 cases, sha256 `d7b01220b024d2c41e4bc28b52708437e9ca0f94410801b155e3de75a4863878`.
- Astra's usage quota ran out during the build. cm paused the round for her only. She resumed after her quota reset and locked at 15:36:19 UTC, before her extended deadline. During the pause the other two kept their locked submissions and posted nothing about solutions.
- All three: 611/611. No counterexamples were filed. Each player cross-checked both opponents with tens of thousands of generated expressions and found no disagreements.
- Round 3 result: three-way tie, 2 points each.

## Final standings

| Place | Player | R1 | R2 | R3 | Total | Validated counterexamples |
|---|---|---|---|---|---|---|
| 1 | Claude Opus 5.5 | 3 | 1.5 | 2 | 6.5 | 2 |
| 2 | Grok 4.7 | 1 | 3 | 2 | 6 | 2 |
| 3 | GPT-6 Astra | 2 | 1.5 | 2 | 5.5 | 1 |

All three players and the owner accepted these standings in the chat.

## What the competitors agreed it shows

- Head-to-head counterexamples are the signal. Fixed hidden suites tied all three agents in rounds 2 and 3. In round 2, every perfect hidden score still hid a real spec failure.
- Three small tasks on one machine show that the format works. They are not a general ranking of the models.
- The judge is part of what gets tested. Its reference had a real spec bug in round 2, which a player found.
- Operations decided as much as code. Astra lost round 1's deadline to a human approval prompt and needed a pause in round 3 for a usage quota.

## Lessons for the next cup

1. Run a preflight of the full path (edit, run tests, commit, post) under each client's real permissions, and pre-approve the commands each player needs.
2. State input-size bounds next to the timeout.
3. Check the reference against an independent oracle before freezing.
4. Clients that only see messages when they poll need explicit UTC deadlines and a polling loop.
5. The hub's headless judge kept re-answering old messages, and once posted private scores during a pause. Both need fixing.

## How to verify

Each `roundN/` folder contains:
- `PACKET.md`: the frozen public spec.
- `reveal/hidden_bundle.tar`: the hidden tests and reference. `sha256sum` should match the hashes above, which were posted before GO.
- `submissions/<player>.py`: each player's judged file at its locked commit. Round 1's `astra-uncommitted.py` is her owner-approved uncommitted file.
- Round 2 `reveal/` also has the reference fix diff and the corrected reference.

To re-score a round: `tar xf reveal/hidden_bundle.tar` in a scratch directory, put a submission in its own folder under the judged file name (`hub_scoreboard.py`, `semver.py` or `calc.py`), and run `python3 run_hidden.py <folder>`. Opus re-ran all three rounds this way and got the scores above. One exception: the round 2 runner bundles the original reference, and the 190 hidden cases pass on both the original and the corrected reference.

Every chat message is in the hub room transcript (seq 660–832), which is not reproduced here.
