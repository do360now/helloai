#!/usr/bin/env python3
"""hub_scoreboard: Worktree Cup leaderboard from per-round result JSON files.

Usage: python3 hub_scoreboard.py --results F [--results F ...] [--format table|json]

Every input is validated before anything is printed. Any invalid input or usage
exits 2 with a message on stderr and nothing on stdout.
"""
import json
import sys
from decimal import Decimal, InvalidOperation
from fractions import Fraction

PLAYERS = ("astra", "grok", "opus")
TOP_KEYS = {"schema_version", "round_id", "players", "hidden_tests", "counterexamples", "forfeits"}
SLOTS = (3, 2, 1)

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)


class InputError(Exception):
    pass


# ---------------------------------------------------------------- arguments

def parse_args(argv):
    files, fmt = [], "table"
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg in ("--results", "--format"):
            if i + 1 >= len(argv):
                raise InputError(f"{arg} needs a value")
            value = argv[i + 1]
            if arg == "--results":
                files.append(value)
            else:
                if value not in ("table", "json"):
                    raise InputError(f"invalid --format: {value!r}")
                fmt = value
            i += 2
        else:
            raise InputError(f"unknown argument: {arg!r}")
    if not files:
        raise InputError("at least one --results FILE is required")
    return files, fmt


# ---------------------------------------------------------------- strict JSON

def _no_duplicates(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise InputError(f"duplicate key {key!r}")
        obj[key] = value
    return obj


def _reject_constant(name):
    raise InputError(f"{name} is not valid JSON")


def load_json(path):
    try:
        with open(path, "rb") as fh:
            raw = fh.read()
    except OSError as e:
        raise InputError(f"{path}: cannot read: {e.strerror or e}")
    if raw.startswith(b"\xef\xbb\xbf"):
        raise InputError(f"{path}: UTF-8 BOM not allowed")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise InputError(f"{path}: not valid UTF-8")
    try:
        return json.loads(
            text,
            object_pairs_hook=_no_duplicates,
            parse_float=Decimal,
            parse_constant=_reject_constant,
        )
    except InputError as e:
        raise InputError(f"{path}: {e}")
    except (ValueError, RecursionError) as e:
        raise InputError(f"{path}: invalid JSON: {e}")


# ---------------------------------------------------------------- validation

def _whole_number(value, what):
    """Return value as int if it is a finite, integer-valued JSON number."""
    if isinstance(value, bool):
        raise InputError(f"{what} must be an integer")
    if isinstance(value, int):
        return value
    if isinstance(value, Decimal):
        try:
            if value.is_finite() and value == value.to_integral_value():
                return int(value)
        except InvalidOperation:
            pass
    raise InputError(f"{what} must be an integer")


def _exact_keys(obj, keys, what):
    if not isinstance(obj, dict):
        raise InputError(f"{what} must be an object")
    if set(obj) != set(keys):
        missing = sorted(set(keys) - set(obj))
        extra = sorted(set(obj) - set(keys))
        raise InputError(f"{what}: missing {missing} / unknown {extra}")


def _player_name(value, what):
    if not isinstance(value, str) or value not in PLAYERS:
        raise InputError(f"{what} must be one of {list(PLAYERS)}")
    return value


def validate_round(doc):
    """Return (round_id, {player: passed}, [(by, against) validated], {forfeited})."""
    _exact_keys(doc, TOP_KEYS, "top level")

    sv = doc["schema_version"]
    if isinstance(sv, bool) or not isinstance(sv, int) or sv != 1:
        raise InputError("schema_version must be 1")

    rid = doc["round_id"]
    if not isinstance(rid, str) or rid == "":
        raise InputError("round_id must be a nonempty string")

    players = doc["players"]
    if (not isinstance(players, list) or len(players) != len(PLAYERS)
            or not all(isinstance(p, str) for p in players)
            or sorted(players) != sorted(PLAYERS)):
        raise InputError(f"players must be exactly {list(PLAYERS)}")

    ht = doc["hidden_tests"]
    _exact_keys(ht, PLAYERS, "hidden_tests")
    passed, totals = {}, set()
    for p in PLAYERS:
        _exact_keys(ht[p], ("passed", "total"), f"hidden_tests.{p}")
        n = _whole_number(ht[p]["passed"], f"hidden_tests.{p}.passed")
        t = _whole_number(ht[p]["total"], f"hidden_tests.{p}.total")
        if t <= 0:
            raise InputError(f"hidden_tests.{p}.total must be > 0")
        if not 0 <= n <= t:
            raise InputError(f"hidden_tests.{p}.passed must be within 0..total")
        passed[p] = n
        totals.add(t)
    if len(totals) != 1:
        raise InputError("all players in a round must have the same total")

    ces = doc["counterexamples"]
    if not isinstance(ces, list):
        raise InputError("counterexamples must be an array")
    pairs, validated = set(), []
    for i, ce in enumerate(ces):
        _exact_keys(ce, ("by", "against", "validated"), f"counterexamples[{i}]")
        by = _player_name(ce["by"], f"counterexamples[{i}].by")
        against = _player_name(ce["against"], f"counterexamples[{i}].against")
        if by == against:
            raise InputError(f"counterexamples[{i}]: by and against must differ")
        if not isinstance(ce["validated"], bool):
            raise InputError(f"counterexamples[{i}].validated must be boolean")
        if (by, against) in pairs:
            raise InputError(f"counterexamples: duplicate pair {by}->{against}")
        pairs.add((by, against))
        if ce["validated"]:
            validated.append((by, against))

    forfeits = doc["forfeits"]
    if not isinstance(forfeits, list):
        raise InputError("forfeits must be an array")
    for i, f in enumerate(forfeits):
        _player_name(f, f"forfeits[{i}]")
    if len(set(forfeits)) != len(forfeits):
        raise InputError("forfeits must be unique")

    return rid, passed, validated, set(forfeits)


# ---------------------------------------------------------------- scoring

def score_round(passed, validated, forfeits):
    """Return ({player: Fraction points}, {player: breaks})."""
    breaks = {p: 0 for p in PLAYERS}
    for by, against in validated:
        if by not in forfeits and against not in forfeits:
            breaks[by] += 1

    points = {p: Fraction(0) for p in PLAYERS}
    eligible = sorted((p for p in PLAYERS if p not in forfeits),
                      key=lambda p: (passed[p], breaks[p]), reverse=True)
    i = 0
    while i < len(eligible):
        key = (passed[eligible[i]], breaks[eligible[i]])
        j = i
        while j < len(eligible) and (passed[eligible[j]], breaks[eligible[j]]) == key:
            j += 1
        share = Fraction(sum(SLOTS[i:j]), j - i)
        for p in eligible[i:j]:
            points[p] = share
        i = j
    return points, breaks


def standings(rounds):
    """rounds: list of (round_id, points, breaks). Returns display-ordered entries."""
    total = {p: sum((r[1][p] for r in rounds), Fraction(0)) for p in PLAYERS}
    brk = {p: sum(r[2][p] for r in rounds) for p in PLAYERS}
    entries = []
    for p in PLAYERS:
        place = 1 + sum(1 for q in PLAYERS if total[q] > total[p])
        per_round = {rid: pts[p] for rid, pts, _ in sorted(rounds, key=lambda r: r[0])}
        entries.append({"place": place, "player": p, "points": total[p],
                        "breaks": brk[p], "rounds": per_round})
    entries.sort(key=lambda e: (e["place"], e["player"]))
    return entries


# ---------------------------------------------------------------- output

def _json_num(f):
    return f.numerator if f.denominator == 1 else float(f)


def _text_num(f):
    if f.denominator == 1:
        return str(f.numerator)
    halves = f * 2
    assert halves.denominator == 1
    return f"{halves.numerator // 2}.5"


def render_json(entries):
    out = {"standings": [
        {"place": e["place"], "player": e["player"], "points": _json_num(e["points"]),
         "breaks": e["breaks"],
         "rounds": {rid: _json_num(v) for rid, v in e["rounds"].items()}}
        for e in entries]}
    return json.dumps(out, indent=2) + "\n"


def render_table(entries, round_ids):
    header = ["place", "player", "points", "breaks"] + round_ids
    rows = [header] + [
        [str(e["place"]), e["player"], _text_num(e["points"]), str(e["breaks"])]
        + [_text_num(e["rounds"][rid]) for rid in round_ids]
        for e in entries]
    widths = [max(len(r[c]) for r in rows) for c in range(len(header))]
    lines = ["  ".join(cell.ljust(w) for cell, w in zip(r, widths)).rstrip() for r in rows]
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- main

def main(argv):
    try:
        files, fmt = parse_args(argv)
        rounds, seen = [], set()
        for path in files:
            rid, passed, validated, forfeits = validate_round(load_json(path))
            if rid in seen:
                raise InputError(f"duplicate round_id {rid!r}")
            seen.add(rid)
            pts, brk = score_round(passed, validated, forfeits)
            rounds.append((rid, pts, brk))
    except InputError as e:
        sys.stderr.write(f"hub_scoreboard: error: {e}\n")
        return 2

    entries = standings(rounds)
    if fmt == "json":
        text = render_json(entries)
    else:
        text = render_table(entries, sorted(seen))
    sys.stdout.buffer.write(text.encode("utf-8", "surrogatepass"))
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
