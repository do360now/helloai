"""Deterministic Worktree Cup scoreboard (PACKET v1.1)."""

import argparse
from decimal import Decimal
import json
import sys


PLAYERS = ("astra", "grok", "opus")


class InputError(ValueError):
    """A result document violates the public contract."""


def require(condition, message):
    if not condition:
        raise InputError(message)


def object_keys(value, keys, label):
    require(type(value) is dict, f"{label} must be an object")
    require(set(value) == set(keys), f"{label} has missing or unknown fields")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON object key")
        result[key] = value
    return result


def invalid_constant(value):
    raise InputError("non-finite JSON number")


def integer_value(value):
    # Decimal preserves the mathematical value of exponent/fraction tokens;
    # binary floats would round some forbidden fractions to whole numbers.
    if type(value) is int:
        return value
    require(type(value) is Decimal and value.is_finite(), "count must be a finite number")
    require(value == value.to_integral_value(), "count must have an integer value")
    return int(value)


def player_list(value, label, complete=False):
    require(type(value) is list, f"{label} must be an array")
    require(all(type(p) is str and p in PLAYERS for p in value), f"{label} has an unknown player")
    require(len(set(value)) == len(value), f"{label} has duplicate players")
    if complete:
        require(set(value) == set(PLAYERS), "players must contain all three players")


def validate_round(data):
    object_keys(data, ("schema_version", "round_id", "players", "hidden_tests", "counterexamples", "forfeits"), "round")
    require(type(data["schema_version"]) is int and data["schema_version"] == 1, "unsupported schema_version")
    require(type(data["round_id"]) is str and len(data["round_id"]) > 0, "round_id must be a nonempty string")
    player_list(data["players"], "players", complete=True)
    player_list(data["forfeits"], "forfeits")
    object_keys(data["hidden_tests"], PLAYERS, "hidden_tests")
    totals = []
    for player in PLAYERS:
        entry = data["hidden_tests"][player]
        object_keys(entry, ("passed", "total"), "hidden test entry")
        passed = integer_value(entry["passed"])
        total = integer_value(entry["total"])
        require(total > 0 and 0 <= passed <= total, "invalid passed/total range")
        entry["passed"], entry["total"] = passed, total
        totals.append(total)
    require(len(set(totals)) == 1, "totals must agree within each round")
    require(type(data["counterexamples"]) is list, "counterexamples must be an array")
    seen = set()
    for entry in data["counterexamples"]:
        object_keys(entry, ("by", "against", "validated"), "counterexample")
        for field in ("by", "against"):
            require(type(entry[field]) is str and entry[field] in PLAYERS, "unknown counterexample player")
        require(entry["by"] != entry["against"], "self counterexample")
        require(type(entry["validated"]) is bool, "validated must be boolean")
        pair = (entry["by"], entry["against"])
        require(pair not in seen, "duplicate counterexample pair")
        seen.add(pair)
    return data


def load_rounds(paths):
    rounds = {}
    for path in paths:
        with open(path, "r", encoding="utf-8") as source:
            document = json.load(source, object_pairs_hook=unique_object,
                                 parse_float=Decimal, parse_constant=invalid_constant)
        data = validate_round(document)
        require(data["round_id"] not in rounds, "duplicate round_id")
        rounds[data["round_id"]] = data
    return rounds


def score_round(data):
    forfeits = set(data["forfeits"])
    breaks = dict.fromkeys(PLAYERS, 0)
    for entry in data["counterexamples"]:
        if entry["validated"] and entry["by"] not in forfeits and entry["against"] not in forfeits:
            breaks[entry["by"]] += 1
    keys = {p: (data["hidden_tests"][p]["passed"], breaks[p]) for p in PLAYERS}
    eligible = sorted((p for p in PLAYERS if p not in forfeits), key=keys.get, reverse=True)
    points = dict.fromkeys(PLAYERS, 0)
    start = 0
    while start < len(eligible):
        end = start + 1
        while end < len(eligible) and keys[eligible[end]] == keys[eligible[start]]:
            end += 1
        # The average of consecutive slots is the mean of the endpoints.
        award = (3 - start + 3 - (end - 1)) / 2
        for player in eligible[start:end]:
            points[player] = award
        start = end
    return points, breaks


def standings(rounds):
    entries = {p: {"player": p, "points": 0, "breaks": 0, "rounds": {}} for p in PLAYERS}
    for round_id in sorted(rounds):
        points, breaks = score_round(rounds[round_id])
        for player, entry in entries.items():
            entry["points"] += points[player]
            entry["breaks"] += breaks[player]
            entry["rounds"][round_id] = points[player]
    for entry in entries.values():
        entry["place"] = 1 + sum(other["points"] > entry["points"] for other in entries.values())
    return sorted(entries.values(), key=lambda e: (e["place"], e["player"]))


def points_text(number):
    return str(int(number)) if number == int(number) else f"{number:.1f}"


def render_table(entries, round_ids):
    rows = [["place", "player", "points", "breaks", *round_ids]]
    for entry in entries:
        rows.append([str(entry["place"]), entry["player"], points_text(entry["points"]),
                     str(entry["breaks"]), *[points_text(entry["rounds"][r]) for r in round_ids]])
    widths = [max(len(cell) for cell in column) for column in zip(*rows)]
    return "\n".join("  ".join(cell.ljust(width) for cell, width in zip(row, widths)).rstrip() for row in rows) + "\n"


def main(argv=None):
    # Python 3.11's digit cap otherwise rejects valid, arbitrarily large counts.
    if hasattr(sys, "set_int_max_str_digits"):
        sys.set_int_max_str_digits(0)
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--results", action="append", required=True)
    parser.add_argument("--format", choices=("table", "json"), default="table")
    args = parser.parse_args(argv)
    try:
        rounds = load_rounds(args.results)
        entries = standings(rounds)
        output = (json.dumps({"standings": entries}, ensure_ascii=True) + "\n"
                  if args.format == "json" else render_table(entries, sorted(rounds)))
    except (ValueError, OSError, UnicodeError, RecursionError) as exc:
        message = " ".join(str(exc).splitlines())
        print(f"error: {message}", file=sys.stderr)
        return 2
    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
