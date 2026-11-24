import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCanarySample,
  addRollbackSample,
  applyRollout,
  approve,
  canApprove,
  canaryStatus,
  rollbackStatus,
  startRelease,
} from './release.mjs';

test('changing traffic withdraws the approval and leaves compatible rollback evidence usable', () => {
  const original = startRelease();
  const changed = applyRollout(original, { target: 10, rollback: 2 });

  assert.equal(original.approvedRevision, 1);
  assert.equal(changed.revision, 2);
  assert.equal(changed.approvedRevision, null);
  assert.equal(canaryStatus(changed), 'stale');
  assert.equal(rollbackStatus(changed), 'verified');
  assert.equal(approve(changed), changed);
});

test('the current revision can be approved after attaching a matching sample', () => {
  const changed = applyRollout(startRelease(), { target: 10, rollback: 2 });
  const verified = addCanarySample(changed, { matchesTarget: true });
  const approved = approve(verified);

  assert.equal(verified.evidence.canary.matched, 10);
  assert.equal(approved.approvedRevision, 2);
  assert.equal(canApprove(approved), true);
  assert.equal(approve(approved), approved);
});

test('an off-target sample disqualifies the current revision and any prior approval', () => {
  const changed = applyRollout(startRelease(), { target: 10, rollback: 2 });
  const approved = approve(addCanarySample(changed, { matchesTarget: true }));
  const failed = addCanarySample(approved, { matchesTarget: false });

  assert.equal(failed.evidence.canary.matched, 9);
  assert.equal(canaryStatus(failed), 'failed');
  assert.equal(failed.approvedRevision, null);
  assert.equal(canApprove(failed), false);
  assert.equal(approve(failed), failed);
});

test('a changed rollback threshold also needs fresh evidence', () => {
  const changed = applyRollout(startRelease(), { target: 20, rollback: 4 });
  const partial = addCanarySample(changed, { matchesTarget: true });

  assert.equal(rollbackStatus(partial), 'stale');
  assert.equal(canApprove(partial), false);
  assert.equal(approve(addRollbackSample(partial)).approvedRevision, 2);
});

test('unchanged settings do not make a new revision and invalid settings are rejected', () => {
  const original = startRelease();

  assert.equal(applyRollout(original, { target: 5, rollback: 2 }), original);
  assert.throws(() => applyRollout(original, { target: 0, rollback: 2 }), RangeError);
  assert.throws(() => applyRollout(original, { target: 5, rollback: -1 }), RangeError);
});
