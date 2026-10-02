import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

// The app's former address (propertycarecrete.base44.app) no longer exists and
// shows "App not found". Sign-in, Google sign-in and logout are sent to the
// app base URL a browser has remembered — so a remembered value pointing at the
// retired address is discarded and the current site is used instead.
const RETIRED_HOST = 'propertycarecrete.base44.app';
let { appBaseUrl } = appParams;
if (appBaseUrl && appBaseUrl.includes(RETIRED_HOST)) {
  appBaseUrl = undefined;
  window.localStorage.removeItem('base44_app_base_url');
}

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});