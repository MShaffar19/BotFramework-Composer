// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useMemo, useEffect, useState, useRef } from 'react';
import ReactWebChat, { createStyleSet } from 'botframework-webchat';
import formatMessage from 'format-message';
import { createStore as createWebChatStore } from 'botframework-webchat-core';

import webChatStyleOptions from './utils/webChatTheme';
import { ConversationService } from './utils/ConversationService';
import { WebChatHeader } from './WebChatHeader';

const BASEPATH = process.env.PUBLIC_URL || 'http://localhost:3000/';

export interface WebChatPanelProps {
  /** Bot runtime url. */
  botUrl: string;
  secrets: { msAppId: string; msPassword: string };
  /** Directline host url. By default, set to Composer host url. */
  directlineHostUrl?: string;
}

export const WebChatPanel: React.FC<WebChatPanelProps> = ({ botUrl, secrets, directlineHostUrl = BASEPATH }) => {
  const [directlineObj, setDirectline] = useState<any>(undefined);
  const conversationServiceRef = useRef<ConversationService>(new ConversationService(directlineHostUrl));
  const conversationService = conversationServiceRef.current;

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const user = useMemo(() => {
    return conversationService.getUser();
  }, []);

  const onRestartConversationClick = async (oldConversationId: string, requireNewConversationId: boolean) => {
    const newUser = conversationService.getUser();
    const chatObj = conversationService.getChatData(oldConversationId);
    let conversationId;
    if (requireNewConversationId) {
      conversationId = `${conversationService.generateUniqueId()}|${chatObj.chatMode}`;
    } else {
      conversationId = chatObj.conversationId || `${conversationService.generateUniqueId()}|${chatObj.chatMode}`;
    }
    chatObj.directline.end();

    const resp = await conversationService.conversationUpdate(oldConversationId, conversationId, newUser.id);
    const { endpointId } = resp.data;
    const dl = await conversationService.fetchDirectLineObject(conversationId, {
      mode: 'conversation',
      endpointId: endpointId,
      userId: newUser.id,
    });
    setDirectline(dl);
  };

  const onSaveTranscriptClick = async (conversationId: string) => {
    const downloadLink = downloadLinkRef.current;
    if (!downloadLink) return;

    const resp = await conversationService.getTranscriptsData(conversationId);
    const transcripts = resp.data;

    const blob = new Blob([JSON.stringify(transcripts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    downloadLink.download = 'transcripts.transcript';
    downloadLink.href = url;
    downloadLink.click();
  };

  async function fetchDLEssentials() {
    const resp: any = await conversationService.startConversation({
      botUrl,
      channelServiceType: 'public',
      members: [user],
      mode: 'conversation',
      msaAppId: secrets.msAppId,
      msaPassword: secrets.msPassword,
    });

    const dl = await conversationService.fetchDirectLineObject(resp.data.conversationId, {
      mode: 'conversation',
      endpointId: resp.data.endpointId,
      userId: user.id,
    });
    setDirectline(dl);
  }

  useEffect(() => {
    if (botUrl) {
      fetchDLEssentials();
    }
  }, [botUrl, secrets]);

  const webchatContent = useMemo(() => {
    if (directlineObj?.conversationId) {
      conversationService.connectToErrorsChannel();
      conversationService.sendInitialActivity(directlineObj.conversationId, [user]);
      conversationService.saveChatData({
        conversationId: directlineObj.conversationId,
        chatMode: 'livechat',
        directline: directlineObj,
        user,
      });
      const webchatStore = createWebChatStore({});
      const styleSet = createStyleSet({ ...webChatStyleOptions });

      return (
        <ReactWebChat
          key={directlineObj.conversationId}
          directLine={directlineObj}
          disabled={!botUrl}
          store={webchatStore}
          styleSet={styleSet}
          userID={conversationService.getUser().id}
        />
      );
    }
    return null;
  }, [directlineObj]);

  if (!directlineObj) {
    return null;
  } else {
    return (
      <>
        <WebChatHeader
          conversationId={directlineObj.conversationId}
          onRestartConversation={() => onRestartConversationClick(directlineObj.conversationId, false)}
          onSaveTranscript={onSaveTranscriptClick}
          onStartNewConversation={() => onRestartConversationClick(directlineObj.conversationId, true)}
        />
        <div data-testid="WebChat-Content" style={{ height: 'calc(100% - 36px)' }}>
          {webchatContent}
        </div>
        {/* A shadow download link to trigger browser native API on saving transcript JSON.  */}
        <a ref={downloadLinkRef} href="#save" style={{ display: 'none' }}>
          {formatMessage('Save')}
        </a>
      </>
    );
  }
};
