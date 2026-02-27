interface DesktopAppInfo {
  name: string;
  version: string;
  isPackaged: boolean;
  platform: string;
  backendUrl: string | null;
}

interface DesktopBridgeApi {
  getAppInfo: () => Promise<DesktopAppInfo>;
  openExternal: (url: string) => Promise<boolean>;
}

interface Window {
  pmspecDesktop?: DesktopBridgeApi;
}
