declare module 'expo-server-sdk' {
  export type ExpoPushMessage = {
    to: string | string[];
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    sound?: 'default' | null;
  };

  export class Expo {
    constructor(options?: { accessToken?: string });
    static isExpoPushToken(token: string): boolean;
    chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][];
    sendPushNotificationsAsync(messages: ExpoPushMessage[]): Promise<unknown[]>;
  }
}
