import { useEffect, useState } from 'react';
import {
  getDirectorStatus,
  subscribeDirectorStatus,
} from '@/core/ai/director/director-service';

export function useDirectorStatus() {
  const [status, setStatus] = useState(getDirectorStatus);
  useEffect(() => subscribeDirectorStatus(() => setStatus(getDirectorStatus())), []);
  return status;
}
