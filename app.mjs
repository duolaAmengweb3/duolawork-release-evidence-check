import {
  addCanarySample,
  addRollbackSample,
  applyRollout,
  approve,
  canApprove,
  canaryStatus,
  rollbackOptions,
  rollbackStatus,
  startRelease,
  trafficOptions,
} from './release.mjs';

const byId = (id) => document.getElementById(id);
const targetSelect = byId('canary-target');
const rollbackSelect = byId('rollback-target');
const approveButton = byId('approve');

let release = startRelease();

for (const target of trafficOptions) targetSelect.add(new Option(`${target}%`, target));
for (const threshold of rollbackOptions) rollbackSelect.add(new Option(`${threshold}%`, threshold));

const checkLabels = { stale: 'Needs update', failed: 'Failed', verified: 'Verified' };

function showCheck(id, status) {
  const output = byId(id);
  output.dataset.state = status;
  output.value = checkLabels[status];
}

function render() {
  const canary = canaryStatus(release);
  const rollback = rollbackStatus(release);
  const ready = canApprove(release);
  const approved = release.approvedRevision === release.revision;
  const measurement = release.evidence.canary;
  const savedThreshold = release.evidence.rollback.threshold;

  targetSelect.value = String(release.target);
  rollbackSelect.value = String(release.rollback);
  byId('revision').textContent = release.revision;
  const releaseStatus = byId('release-status');
  releaseStatus.value = approved ? `Revision ${release.revision} approved` : `Revision ${release.revision} awaiting approval`;
  releaseStatus.dataset.state = approved ? 'verified' : 'pending';

  showCheck('canary-status', canary);
  showCheck('rollback-status', rollback);
  byId('canary-detail').textContent = `${measurement.matched} of ${measurement.samples} requests went to canary in revision ${measurement.revision}. Current target is ${release.target}%.`;
  byId('rollback-detail').textContent = `Last passing fixture used a ${savedThreshold}% threshold. Current threshold is ${release.rollback}%.`;
  byId('approval-detail').textContent = approved ? 'Both checks supported this approval.' : ready ? 'Both checks are verified. This revision can be approved.' : 'Approval is blocked until both checks are verified.';
  approveButton.disabled = approved || !ready;

  const historyItems = release.history.map((entry) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'activity-revision';
    label.textContent = `Revision ${entry.revision}`;
    item.append(label, document.createTextNode(entry.text));
    return item;
  });
  byId('activity-items').replaceChildren(...historyItems);
}

function update(next) {
  release = next;
  render();
}

byId('rollout-form').addEventListener('submit', (event) => {
  event.preventDefault();
  update(applyRollout(release, {
    target: Number(targetSelect.value),
    rollback: Number(rollbackSelect.value),
  }));
});
byId('sample-pass').addEventListener('click', () => update(addCanarySample(release, { matchesTarget: true })));
byId('sample-fail').addEventListener('click', () => update(addCanarySample(release, { matchesTarget: false })));
byId('sample-rollback').addEventListener('click', () => update(addRollbackSample(release)));
approveButton.addEventListener('click', () => update(approve(release)));
byId('reset').addEventListener('click', () => update(startRelease()));

render();
