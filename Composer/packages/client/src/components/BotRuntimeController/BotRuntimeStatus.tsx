// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { defaultPublishConfig } from '@bfc/shared';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import * as React from 'react';

import { BotStatus } from '../../constants';
import { botStatusState, dispatcherState } from '../../recoilModel';
import { useInterval } from '../../utils/hooks';

import { useBotOperations } from './useBotOperations';

const pollingInterval = 3000;

export type BotRuntimeStatusProps = {
  projectId: string;
};

export const BotRuntimeStatus = React.memo((props: BotRuntimeStatusProps) => {
  const { projectId } = props;

  const currentBotStatus = useRecoilValue(botStatusState(projectId));
  const { getPublishStatus } = useRecoilValue(dispatcherState);
  const [isRunning, setIntervalRunning] = useState(false);
  const { startSingleBot, stopSingleBot } = useBotOperations();

  useInterval(
    () => {
      getPublishStatus(projectId, defaultPublishConfig);
    },
    isRunning ? pollingInterval : null
  );

  useEffect(() => {
    switch (currentBotStatus) {
      case BotStatus.failed:
        setIntervalRunning(false);
        stopSingleBot(projectId);
        break;
      case BotStatus.published:
        setIntervalRunning(false);
        startSingleBot(projectId, true);
        break;
      case BotStatus.reloading:
        setIntervalRunning(true);
        break;

      case BotStatus.connected: {
        if (isRunning) {
          setTimeout(() => {
            getPublishStatus(projectId, defaultPublishConfig);
          }, pollingInterval);
        }
        setIntervalRunning(false);
        break;
      }
    }
  }, [currentBotStatus]);

  return null;
});
