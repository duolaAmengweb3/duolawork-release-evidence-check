# Release Evidence Check

Release Evidence Check is a standalone browser demo for reviewing a checkout rollout. Edits create a new revision, clear the previous approval, and make the previous canary sample stale. A rollback check still counts when the rollback threshold stays the same. The current revision can be approved after both checks pass.

Every measurement is synthetic. The demo runs locally without an account or a database. Reloading the page resets the fixture.

## Run locally

Use Node.js 20 or later. The app has no npm dependencies and was tested with Node.js 24.19.0 and npm 11.17.0.

```sh
npm test
npm start
```

Open `http://127.0.0.1:8144/`. To use another port, set `PORT` to the same value for both the server and the Kane runner.

## Verify with Kane CLI

Kane needs a TestMu AI account and its own authorization. Sign in using the account registered for the event. Install the official `@testmuai/kane-cli` package and record the actual `kane-cli --version` for the submission. Use `kane-cli login --oauth` if the machine has no authenticated profile. [TestMu AI authentication documentation](https://www.testmuai.com/docs/docs/kane-cli-authentication)

With `npm start` running in a separate terminal, run both scenarios.

```sh
npm run verify:kane
```

To run only one, use `npm run verify:kane -- matching` or `npm run verify:kane -- offTarget`.

1. **Matching sample.** Raise the approved fixture from 5% to 10%. Verify that the old canary is stale, the rollback check still passes, and approval is blocked. Attach a synthetic 10-of-100 sample and approve revision 2.
2. **Off-target sample.** Make the same rollout change, then attach a synthetic 9-of-100 sample. Verify that the current revision stays unapproved and the approval button stays disabled.

The runner uses a fresh browser scenario per invocation. It records the real exit code and terminal `run_end` result, writes the vendor traces under `artifacts/`, and exits nonzero unless every selected scenario passed. Review logs before sharing anything. The two prompts and pass criteria are in `run-kane.mjs`.

## Verification record

`npm test` checks five state transitions. A separate local Chromium test exercises the positive and negative flows using the visible controls. Record the Kane CLI version, timestamp, and matching/off-target run verdicts after executing the authenticated Kane tests. The local tests establish application behavior. An authenticated run provides the contest's evidence.
