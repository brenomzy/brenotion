import { useCallback, useEffect, useState } from 'react';

import {
  type HomeScenario,
  type HomeSnapshotResult,
  type HomeSnapshotSource,
} from '@/modules/home/home-snapshot-source';

type HomeSnapshotLoadState =
  | Readonly<{ status: 'loading' }>
  | HomeSnapshotResult;

export function useHomeSnapshot(source: HomeSnapshotSource, scenario: HomeScenario) {
  const [loadedState, setLoadedState] = useState<{
    scenario: HomeScenario;
    requestId: number;
    result: HomeSnapshotResult;
  } | null>(null);
  const [requestId, setRequestId] = useState(0);

  const retry = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    source.load(scenario).then((result) => {
      if (active) {
        setLoadedState({ scenario, requestId, result });
      }
    });

    return () => {
      active = false;
    };
  }, [requestId, scenario, source]);

  const state: HomeSnapshotLoadState =
    loadedState?.scenario === scenario && loadedState.requestId === requestId
      ? loadedState.result
      : { status: 'loading' };

  return { state, retry };
}
