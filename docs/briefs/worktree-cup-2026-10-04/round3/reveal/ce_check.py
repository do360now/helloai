import sys, json
sys.path.insert(0, "bundle")
import run_hidden as h
case = json.loads(sys.stdin.read() if len(sys.argv) < 2 else sys.argv[1])
for n in ["ref"] + ["judge/" + x for x in ("opus", "grok", "astra")]:
    try:
        ok, why = h.run_case(n, case)
    except Exception as e:
        ok, why = False, "EXC %s" % type(e).__name__
    print(n, "MATCHES expectation" if ok else "DIFFERS", "" if ok else why[:150])
