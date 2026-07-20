import { useQuery } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import {
  buildObligationListItems,
  type Obligation,
} from './obligations-presentation-model';

export function useObligationsSource() {
  const result = useQuery(api.obligations.list, { includeInactive: true });

  if (result === undefined) {
    return {
      status: 'loading' as const,
      obligations: [] as Obligation[],
      items: [],
      isTruncated: false,
    };
  }

  const obligations: Obligation[] = result.items;

  return {
    status: 'ready' as const,
    obligations,
    items: buildObligationListItems(obligations),
    isTruncated: result.isTruncated,
  };
}
