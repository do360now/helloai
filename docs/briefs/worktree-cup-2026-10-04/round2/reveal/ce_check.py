import sys, json
sys.path.insert(0, "bundle")
import run_hidden as h
case = json.loads(sys.argv[1])
for n in ["ref", "judge/opus", "judge/grok", "judge/astra"]:
    ok, why = h.run_case(n, case)
    print(n, "MATCHES expectation" if ok else "DIFFERS", "" if ok else why)
