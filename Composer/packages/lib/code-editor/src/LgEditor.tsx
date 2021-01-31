// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as React from 'react';

import { LgCodeEditor, LgCodeEditorProps } from './components/lg/LgCodeEditor';
import { LgResponseEditor } from './components/lg/LgResponseEditor';

export type LgEditorMode = 'codeEditor' | 'responseEditor';

export type LgEditorProps = LgCodeEditorProps & {
  mode: LgEditorMode;
};

export const LgEditor = (props: LgEditorProps) => {
  const { mode, ...editorProps } = props;
  return mode === 'codeEditor' ? <LgCodeEditor {...editorProps} /> : <LgResponseEditor {...editorProps} />;
};
