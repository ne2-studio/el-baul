// Links into the internal log viewer (logs.ne2.studio), pre-filtered so an operator can go
// straight from a baúl or user in the admin panel to that entity's log feed — used when
// diagnosing a user report. `signal-99,signal-130` are the fixed signals for API access and
// business event logs; kept as a literal since the log viewer has no stable name for them yet.
const LOGS_EVENTS_URL = 'https://logs.ne2.studio/#/events';
const LOGS_SIGNALS = 'signal-99,signal-130';
const LOGS_RANGE = '1d';

function buildLogsUrl(field: 'BaulId' | 'UserId', value: string): string {
  return `${LOGS_EVENTS_URL}?range=${LOGS_RANGE}&signal=${LOGS_SIGNALS}&filter=${field}%3D'${value}'`;
}

export function buildBaulLogsUrl(baulId: string): string {
  return buildLogsUrl('BaulId', baulId);
}

export function buildUserLogsUrl(userId: string): string {
  return buildLogsUrl('UserId', userId);
}
