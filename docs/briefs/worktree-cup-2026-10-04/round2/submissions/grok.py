"""Semantic Versioning 2.0.0 precedence helpers."""
import functools
import re

# ASCII only. Major/minor/patch reject leading zeros. Prerelease and build
# identifiers are validated after the match, because their zero rules differ.
_RE = re.compile(
    r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)
_DIGITS = re.compile(r"^[0-9]+$")


def parse(version):
    """Return (major, minor, patch, prerelease, build)."""
    if not isinstance(version, str):
        raise TypeError("version must be a str")
    match = _RE.fullmatch(version)
    if match is None:
        raise ValueError("invalid semantic version: %r" % (version,))
    major, minor, patch, pre, build = match.groups()
    pre_t = tuple(_pre_ident(part) for part in pre.split(".")) if pre else ()
    build_t = tuple(build.split(".")) if build else ()
    return int(major), int(minor), int(patch), pre_t, build_t


def _pre_ident(part):
    if _DIGITS.fullmatch(part):
        if len(part) > 1 and part[0] == "0":
            raise ValueError("invalid prerelease identifier: %r" % (part,))
        return int(part)
    return part


def _precedence(parsed):
    """Key that orders versions by SemVer precedence. Build is omitted."""
    major, minor, patch, pre, _build = parsed
    # A release (no prerelease) outranks any prerelease of the same core.
    pre_key = tuple((0, part) if isinstance(part, int) else (1, part) for part in pre)
    return (major, minor, patch, 0 if pre else 1, pre_key)


def compare(a, b):
    """Return -1, 0 or 1 comparing two version strings by precedence."""
    ka = _precedence(parse(a))
    kb = _precedence(parse(b))
    return (ka > kb) - (ka < kb)


def sort_versions(versions):
    """Return the versions in ascending precedence order."""
    items = list(versions)
    for item in items:
        parse(item)
    return sorted(items, key=functools.cmp_to_key(compare))
