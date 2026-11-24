const sampleSize = 100;

export const trafficOptions = [5, 10, 20];
export const rollbackOptions = [2, 4, 6];

export function startRelease() {
  return {
    revision: 1,
    target: 5,
    rollback: 2,
    evidence: {
      canary: { revision: 1, matched: 5, samples: sampleSize },
      rollback: { threshold: 2, recovered: true },
    },
    approvedRevision: 1,
    history: [
      { revision: 1, text: 'Approved the 5% rollout using both fixture checks.' },
    ],
  };
}

function record(release, text) {
  return {
    ...release,
    history: [{ revision: release.revision, text }, ...release.history],
  };
}

export function applyRollout(release, { target, rollback }) {
  if (!trafficOptions.includes(target) || !rollbackOptions.includes(rollback)) {
    throw new RangeError('Choose a supported traffic target and rollback threshold.');
  }
  if (release.target === target && release.rollback === rollback) return release;
  return record({
    ...release,
    revision: release.revision + 1,
    target,
    rollback,
    approvedRevision: null,
  }, `Applied ${target}% canary traffic and a ${rollback}% rollback threshold.`);
}

export function addCanarySample(release, { matchesTarget }) {
  const matched = matchesTarget ? release.target : release.target - 1;
  return record({
    ...release,
    approvedRevision: null,
    evidence: {
      ...release.evidence,
      canary: { revision: release.revision, matched, samples: sampleSize },
    },
  }, `Attached a synthetic sample with ${matched} of ${sampleSize} requests routed to canary.`);
}

export function addRollbackSample(release) {
  return record({
    ...release,
    approvedRevision: null,
    evidence: {
      ...release.evidence,
      rollback: { threshold: release.rollback, recovered: true },
    },
  }, `Attached a passing rollback fixture for the ${release.rollback}% threshold.`);
}

export function canaryStatus(release) {
  const { canary } = release.evidence;
  if (canary.revision !== release.revision) return 'stale';
  return canary.matched * 100 === release.target * canary.samples ? 'verified' : 'failed';
}

export function rollbackStatus(release) {
  const { rollback } = release.evidence;
  if (rollback.threshold !== release.rollback) return 'stale';
  return rollback.recovered ? 'verified' : 'failed';
}

export function canApprove(release) {
  return canaryStatus(release) === 'verified' && rollbackStatus(release) === 'verified';
}

export function approve(release) {
  if (!canApprove(release) || release.approvedRevision === release.revision) return release;
  return record({ ...release, approvedRevision: release.revision }, 'Approved this revision with both checks verified.');
}
