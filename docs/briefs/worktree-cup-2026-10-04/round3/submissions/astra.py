"""Exact rational expression evaluator. See PACKET.md."""

from fractions import Fraction
import sys


class ExprError(Exception):
    """Raised for syntax / zero_div / domain / limit errors; `kind` holds the category."""

    def __init__(self, kind, message=""):
        Exception.__init__(self, "%s: %s" % (kind, message))
        self.kind = kind


def _tokens(expr):
    """Lex the whole input with ASCII-only, longest-match tokens."""
    tokens = []
    pos = 0
    while pos < len(expr):
        char = expr[pos]
        if char in " \t":
            pos += 1
        elif "0" <= char <= "9":
            start = pos
            while pos < len(expr) and "0" <= expr[pos] <= "9":
                pos += 1
            if pos < len(expr) and expr[pos] == ".":
                pos += 1
                first = pos
                while pos < len(expr) and "0" <= expr[pos] <= "9":
                    pos += 1
                if pos == first:
                    raise ExprError("syntax")
            tokens.append(expr[start:pos])
        elif char in "+-*/%()":
            if expr[pos:pos + 2] in ("**", "//"):
                tokens.append(expr[pos:pos + 2])
                pos += 2
            else:
                tokens.append(char)
                pos += 1
        else:
            raise ExprError("syntax")
    return tokens


_PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2, "//": 2, "%": 2,
               "u+": 3, "u-": 3, "**": 4}


def _parse(tokens):
    """Build postfix instructions iteratively, without evaluating any node.

    Prefix signs are pushed without reducing prior operators. This handles
    both -2**2 and 2**-2 while keeping exponentiation right-associative.
    """
    output, operators = [], []
    need_operand = True
    for token in tokens:
        if "0" <= token[0] <= "9":
            if not need_operand:
                raise ExprError("syntax")
            output.append(token)
            need_operand = False
        elif token == "(":
            if not need_operand:
                raise ExprError("syntax")
            operators.append(token)
        elif token == ")":
            if need_operand:
                raise ExprError("syntax")
            while operators and operators[-1] != "(":
                output.append(operators.pop())
            if not operators:
                raise ExprError("syntax")
            operators.pop()
        elif need_operand:
            if token not in ("+", "-"):
                raise ExprError("syntax")
            operators.append("u" + token)
        else:
            rank = _PRECEDENCE[token]
            while operators and operators[-1] != "(":
                previous = _PRECEDENCE[operators[-1]]
                if previous < rank or (previous == rank and token == "**"):
                    break
                output.append(operators.pop())
            operators.append(token)
            need_operand = True
    if need_operand or "(" in operators:
        raise ExprError("syntax")
    output.extend(reversed(operators))
    return output


def _size(value):
    return max(abs(value.numerator).bit_length(), value.denominator.bit_length())


def _binary(op, left, right):
    if op == "**":
        if right.denominator != 1:
            raise ExprError("domain")
        exponent = right.numerator
        if left == 0 and exponent < 0:
            raise ExprError("zero_div")
        if abs(exponent) * _size(left) > 200000:
            raise ExprError("limit")
        result = left ** exponent
    elif op in ("/", "//", "%"):
        if right == 0:
            raise ExprError("zero_div")
        if op == "/":
            result = left / right
        elif op == "//":
            result = Fraction(left // right)
        else:
            result = left % right
    elif op == "+":
        result = left + right
    elif op == "-":
        result = left - right
    else:
        result = left * right
    if _size(result) > 400000:
        raise ExprError("limit")
    return result


def _decimal(number):
    """Render permitted large results while preserving the caller's limit."""
    if not hasattr(sys, "get_int_max_str_digits"):
        return str(number)
    previous = sys.get_int_max_str_digits()
    try:
        if previous:
            sys.set_int_max_str_digits(0)
        return str(number)
    finally:
        if previous:
            sys.set_int_max_str_digits(previous)


def evaluate(expr):
    if not isinstance(expr, str):
        raise TypeError("expression must be a str")
    if len(expr) > 1000:
        raise ExprError("limit")
    instructions = _parse(_tokens(expr))
    stack = []
    for token in instructions:
        if "0" <= token[0] <= "9":
            stack.append(Fraction(token))
        elif token in ("u+", "u-"):
            if token == "u-":
                stack[-1] = -stack[-1]
        else:
            right = stack.pop()
            left = stack.pop()
            stack.append(_binary(token, left, right))
    value = stack[0]
    numerator = _decimal(value.numerator)
    if value.denominator == 1:
        return numerator
    return numerator + "/" + _decimal(value.denominator)
