# DRAFTS for cmc: D4, D5 and the terms/privacy text (2026-09-25)

**Status: drafts, not published.** Nothing here is on the site. Edit anything, in your own words; then say "apply" and the text goes into `data/site.json` (`affiliations`, `listing_policy`), `/api/status` (`terms_of_use`), and later `/methodology`.

Facts you gave: no credits, payments, employment or equity with any listed vendor (D4 answer: "none of these"); listing rule = hand-picked set with an admission bar (D5 answer). Items marked **[confirm]** are things I could not verify. Everything about logging is read from the code on master 7f226f5.

---

## D4. Affiliations (draft)

> **Who is behind this.** Hello, AI is run by Clement Machado. I have no financial or employment relationship with Anthropic, Google, xAI, Meta, Alibaba or OpenAI: no equity, no payments, no sponsorship, and no free credits or early access. **[confirm: also no affiliate or referral links]**
>
> **What I do use.** The weekly update and the article drafts are produced with the help of AI models, including Claude and Grok, which I pay for like any other customer. **[confirm: "pay for at standard prices"]** Two of the vendors on the list are therefore also tools I depend on, which is a reason to check my work against the method on this page.
>
> **My own product.** I also run the HelloAI app at app.helloai.com. It is a separate product with its own platform fee. Links to it from this site are labelled "our app". Nothing on this site is ranked, promoted or priced on the basis of it.

Why the middle paragraph: the review's README notes that the operator's agent fleet runs on Claude and Grok, and a reader can't see that anywhere today. Saying it is cheaper than being asked. Delete it if you disagree, but D4 as written above is the accurate version.

## D5. Listing rule (draft, for `site.json → listing_policy`)

> We track a hand-picked set of frontier models, currently six. A model is added when its own LMArena text-overall Elo is within 25 points of the lowest-rated model on the list and has held there for two weeks. The same rule applies to every vendor. A model that has no Elo of its own yet is shown as "not yet rated" and is not ranked; we never show a predecessor's score as its own.

Assumptions to confirm:
1. **Removal.** The articles describe only how a model gets in. I wrote nothing about how one leaves. Options: it leaves when it falls more than 25 points under the list's floor for two weeks, or when the vendor retires it, or "at my discretion, with a note in that week's article". Which one is it?
2. **25 points / two weeks** are the numbers the recent articles quote as the bar. **[confirm]** they are the rule you intend.
3. **Unrated models.** Today Claude Opus 5.5 and Grok 4.7 carry their predecessors' Elo. Under this text and the adopted borrowed-score policy they show as "not yet rated" and leave the ranked recommendations until they have their own score. That is a visible change on the site; the code for it is `elo-provenance.md` (wave 2), not yet built.

## Terms and privacy text for the API (draft, for `terms_of_use` and `/methodology`)

Keeps the current fair-use lines and adds what is logged. Every statement below is true of the code on master 7f226f5 **once `METRICS_SALT` is set** (the live-counters paragraph reflects `lib/views-store.ts`, deployed as 2.14.71).

> **Fair use.** The API is free and public, limited to 100 requests per minute per IP address. Agents and developers are welcome. Reselling the data, competitive scraping and abuse are not, and may be blocked.
>
> **What we log.** For each API request we record the time, the path, the names (not the values) of the query parameters, the kind of client (worked out from its User-Agent), and a pseudonymous identifier: a shortened hash of your IP address combined with a secret salt that changes every day, so it cannot be linked from one day to the next. Alerts about unusual traffic also record the User-Agent string. Raw IP addresses are held in memory only, for rate limiting and abuse detection, and are never written to our logs. The application sets no cookies and uses no third-party analytics. **[confirm]** Azure App Service's front end adds its own session-affinity cookies (`ARRAffinity`) to responses; they are the platform's, not ours, and can be switched off in the App Service settings (single instance, so affinity buys nothing). Either turn that off and keep the sentence, or keep this wording.
>
> **Live counters.** The "viewing" and "views" counters keep a salted daily digest of your IP address in the server's memory to count each visitor once per day. It is held in process memory only, until the first counted view after the UTC day changes or the container restarts (whichever comes first); the salt changes each UTC day, so an old digest cannot be matched against a new one. The IP address itself is not stored and nothing about the counters is written to logs. The counts reset whenever the site restarts or is redeployed, so they are not all-time totals, and they can be inflated by someone rotating source IP addresses; they are a vanity counter, not a defended metric.
>
> **Links to our app.** Links from this site to app.helloai.com pass through helloai.com/go/, which counts the click. It records no visitor identifier.
>
> **Hosting.** The site runs on Microsoft Azure, which may keep its own logs, including IP addresses, under its own terms. **[confirm scope]** These terms describe what the application itself logs.
>
> **Retention.** Our application logs are kept for **[N days, fill in once log retention is turned on]**.

Notes:
- "Pseudonymous", not "anonymous": anyone holding both the salt and the logs could brute-force IPv4 addresses. That is why the text says "pseudonymous" and why `METRICS_SALT` must stay secret.
- Without `METRICS_SALT` in production the identifier is `null`, and this paragraph would be overclaiming. Set the salt first.
- Nothing about privacy law (GDPR and similar) is in here. If the site has EU visitors, IP-derived identifiers can count as personal data even when hashed; that is a question for whoever advises you, not something this text settles.
