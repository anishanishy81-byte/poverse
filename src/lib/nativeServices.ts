/**
 * Native Services Plugin for PO-VERSE
 * TypeScript bridge to native Android services for:
 * - Background location tracking
 * - Presence management
 * - Native call notifications
 */

import type { PluginListenerHandle } from '@capacitor/core';

export interface StartLocationTrackingOptions {
  userId: string;
  companyId: string;
  firebaseUrl: string;
  userName?: string;
}

export interface ShowIncomingCallOptions {
  callId: string;
  callerId: string;
  callerName?: string;
  callerPhoto?: string;
  callType?: 'audio' | 'video';
  chatId?: string;
}

export interface ShowOngoingCallOptions {
  callId: string;
  callerId: string;
  callerName?: string;
  callType?: 'audio' | 'video';
}

export interface EndCallOptions {
  callId?: string;
}

export interface LocationPermissionResult {
  granted: boolean;
  backgroundGranted?: boolean;
}

export interface LocationTrackingResult {
  success: boolean;
  message?: string;
  backgroundPermission?: boolean;
}

export interface NativeServicesPlugin {
  /**
   * Start background location tracking service
   * This keeps running even when app is closed
   */
  startLocationTracking(options: StartLocationTrackingOptions): Promise<LocationTrackingResult>;
  
  /**
   * Stop background location tracking service
   */
  stopLocationTracking(): Promise<{ success: boolean; message?: string }>;
  
  /**
   * Check if location tracking is currently active
   */
  isLocationTrackingActive(): Promise<{ active: boolean }>;
  
  /**
   * Show native incoming call notification with full-screen UI
   */
  showIncomingCall(options: ShowIncomingCallOptions): Promise<{ success: boolean }>;
  
  /**
   * Show ongoing call notification
   */
  showOngoingCall(options: ShowOngoingCallOptions): Promise<{ success: boolean }>;
  
  /**
   * End call and dismiss notifications
   */
  endCall(options?: EndCallOptions): Promise<{ success: boolean }>;
  
  /**
   * Cancel incoming call (call was answered elsewhere or cancelled)
   */
  cancelIncomingCall(options?: EndCallOptions): Promise<{ success: boolean }>;
  
  /**
   * Check if location permissions are granted
   */
  checkLocationPermission(): Promise<LocationPermissionResult>;
  
  /**
   * Request location permissions
   */
  requestLocationPermission(): Promise<LocationPermissionResult>;

  /**
   * Listen for native call actions (accept/decline/end)
   */
  addListener(
    eventName: "callAction",
    listenerFunc: (event: { action: string; callId?: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  removeAllListeners(): Promise<void>;
}

// Lazy-initialize the plugin on first use (NOT at module load time)
// This avoids registerPlugin() at module level which changes chunk splitting
let _plugin: NativeServicesPlugin | null = null;
let _initialized = false;

function _getPlugin(): NativeServicesPlugin {
  if (!_initialized) {
    _initialized = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const core = require('@capacitor/core') as { registerPlugin: typeof import('@capacitor/core').registerPlugin };
      _plugin = core.registerPlugin<NativeServicesPlugin>('NativeServices');
    } catch (e) {
      console.warn('[NativeServices] Failed to register plugin:', e);
    }
  }
  if (_plugin) return _plugin;
  // Return a no-op fallback proxy
  return new Proxy({} as NativeServicesPlugin, {
    get: (_target, prop: string) => {
      if (prop === 'addListener') {
        return (..._args: unknown[]) => {
          const handle = { remove: () => Promise.resolve() };
          return Object.assign(Promise.resolve(handle), handle);
        };
      }
      if (prop === 'removeAllListeners') return () => Promise.resolve();
      return () => Promise.resolve({ success: false, message: 'NativeServices plugin not available' });
    }
  });
}

// Export a proxy that delegates to the lazily-initialized plugin
const NativeServices: NativeServicesPlugin = new Proxy({} as NativeServicesPlugin, {
  get: (_target, prop: string) => {
    const plugin = _getPlugin();
    return (plugin as unknown as Record<string, unknown>)[prop];
  }
});

export default NativeServices;
