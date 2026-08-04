import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface SharedFile {
  path: string;
  mimeType: string;
  name: string;
}

export interface IncomingShare {
  shareId: string;
  files: SharedFile[];
}

interface ShareReceiverPlugin {
  getPendingShare(): Promise<{ share?: IncomingShare }>;
  clearPendingShare(): Promise<void>;
  addListener(
    eventName: 'shareReceived',
    listener: (share: IncomingShare) => void,
  ): Promise<PluginListenerHandle>;
}

export const ShareReceiver = registerPlugin<ShareReceiverPlugin>('ShareReceiver');
