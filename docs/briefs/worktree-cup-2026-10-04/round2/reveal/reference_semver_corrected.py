"""Semantic Versioning 2.0.0 precedence helpers (reference)."""
import re
import sys

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)  # PACKET: no length limit on integers

_NUM = r"(?:0|[1-9][0-9]*)"
_PRE_ID = r"(?:0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)"
_BUILD_ID = r"[0-9a-zA-Z-]+"
_RE = re.compile(
    r"(%s)\.(%s)\.(%s)(?:-(%s(?:\.%s)*))?(?:\+(%s(?:\.%s)*))?"
    % (_NUM, _NUM, _NUM, _PRE_ID, _PRE_ID, _BUILD_ID, _BUILD_ID)
)


def parse(version):
    """Return (major, minor, patch, prerelease, build); ValueError if invalid, TypeError if not str."""
    if not isinstance(version, str):
        raise TypeError("version must be a str")
    m = _RE.fullmatch(version)
    if m is None:
        raise ValueError("invalid semantic version: %r" % (version,))
    major, minor, patch, pre, build = m.groups()
    pre_t = tuple(int(p) if p.isdigit() else p for p in pre.split(".")) if pre else ()
    build_t = tuple(build.split(".")) if build else ()
    return int(major), int(minor), int(patch), pre_t, build_t


def _cmp(a, b):
    return (a > b) - (a < b)


def _cmp_pre(pa, pb):
    if not pa and not pb:
        return 0
    if not pa:
        return 1
    if not pb:
        return -1
    for x, y in zip(pa, pb):
        xi, yi = isinstance(x, int), isinstance(y, int)
        if xi and yi:
            c = _cmp(x, y)
        elif xi:
            c = -1
        elif yi:
            c = 1
        else:
            c = _cmp(x, y)
        if c:
            return c
    return _cmp(len(pa), len(pb))


def compare(a, b):
    """-1, 0 or 1 by SemVer precedence (build metadata ignored)."""
    pa, pb = parse(a), parse(b)
    c = _cmp(pa[:3], pb[:3])
    return c if c else _cmp_pre(pa[3], pb[3])


def sort_versions(versions):
    """New list, ascending by precedence; stable; ValueError/TypeError on any bad element."""
    items = [(parse(v), v) for v in versions]
    import functools
    items.sort(key=functools.cmp_to_key(lambda x, y: compare(x[1], y[1])))
    return [v for _, v in items]
