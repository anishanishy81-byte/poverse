import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { User, UserRole, Company } from "@/types/auth";
import { updatePresence } from "@/lib/chat";
import { authenticateUser } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { 
  createSession, 
  clearSession, 
  validateSession, 
  subscribeToSessionChanges 
} from "@/lib/session";

interface AppState {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Background tracking
  isBackgroundTrackingActive: boolean;
  setBackgroundTrackingActive: (state: boolean) => void;
  
  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  company: Company | null;
  sessionError: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: (silent?: boolean) => void;
  setCompany: (company: Company | null) => void;
  setSessionError: (error: string | null) => void;
  validateCurrentSession: () => Promise<boolean>;
  
  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Theme
        isDarkMode: false,
        toggleDarkMode: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode })),

        // Background tracking
        isBackgroundTrackingActive: false,
        setBackgroundTrackingActive: (state) => set({ isBackgroundTrackingActive: state }),

        // Hydration state
        _hasHydrated: false,
        setHasHydrated: (state) => set({ _hasHydrated: state }),

        // Auth
        isAuthenticated: false,
        user: null,
        company: null,
        sessionError: null,
        login: async (username: string, password: string) => {
          try {
            const result = await authenticateUser(username, password);

            if (result.success && result.user) {
              // Fetch company info if user belongs to a company
              let company: Company | null = null;
              if (result.user.companyId) {
                try {
                  company = await getCompanyById(result.user.companyId);
                } catch (e) {
                  console.warn("Failed to fetch company info:", e);
                }
              }

              // Create a new session (non-blocking - don't crash login if session fails)
              try {
                await createSession(result.user.id);
              } catch (e) {
                console.warn("Session creation failed, continuing login:", e);
              }
              
              // Set user as online immediately on login (non-blocking)
              try {
                await updatePresence(result.user.id, true);
              } catch (e) {
                console.warn("Presence update failed:", e);
              }
              
              set({
                isAuthenticated: true,
                user: result.user,
                company,
                sessionError: null,
              });
              return { success: true, user: result.user };
            }

            return { success: false, error: result.error || "Login failed" };
          } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: "An error occurred during login" };
          }
        },
        logout: (silent = false) => {
          const user = get().user;
          if (user?.id) {
            // Set user as offline on logout (non-blocking)
            updatePresence(user.id, false).catch((e: unknown) => {
              console.warn("Presence update on logout failed:", e);
            });
            // Clear session only if not silent (silent = logged out by another device)
            if (!silent) {
              clearSession(user.id).catch((e: unknown) => {
                console.warn("Session clear on logout failed:", e);
              });
            }
          }
          // Clear local session storage
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("sessionToken");
              localStorage.removeItem("sessionUserId");
              localStorage.removeItem("sessionLoginTime");
            } catch (e) {
              console.warn("LocalStorage cleanup failed:", e);
            }
          }
          set({ isAuthenticated: false, user: null, company: null, sessionError: null });
        },
        setCompany: (company) => set({ company }),
        setSessionError: (error) => set({ sessionError: error }),
        validateCurrentSession: async () => {
          const user = get().user;
          if (!user?.id) return false;
          
          const result = await validateSession(user.id);
          if (!result.valid) {
            set({ sessionError: result.reason || "Session invalid" });
            return false;
          }
          return true;
        },

        // UI State
        isSidebarOpen: true,
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      }),
      {
        name: "app-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          isDarkMode: state.isDarkMode,
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          company: state.company,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    )
  )
);

// Selectors for performance optimization
export const useHasHydrated = () => useAppStore((state) => state._hasHydrated);
export const useIsDarkMode = () => useAppStore((state) => state.isDarkMode);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useUser = () => useAppStore((state) => state.user);
export const useCompany = () => useAppStore((state) => state.company);
export const useIsSidebarOpen = () => useAppStore((state) => state.isSidebarOpen);
export const useIsBackgroundTrackingActive = () => useAppStore((state) => state.isBackgroundTrackingActive);

// Role-based access helpers
export const useUserRole = (): UserRole | null => useAppStore((state) => state.user?.role ?? null);
export const useIsSuperAdmin = () => useAppStore((state) => state.user?.role === "superadmin");
export const useIsAdmin = () => useAppStore((state) => state.user?.role === "admin" || state.user?.role === "superadmin");
export const useCanManageUsers = () => useAppStore((state) => state.user?.role === "superadmin" || state.user?.role === "admin");
