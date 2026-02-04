import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { User, UserRole, Company } from "@/types/auth";
import { updatePresence } from "@/lib/chat";
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
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success && data.user) {
              // Create a new session (this will invalidate any existing session)
              await createSession(data.user.id);
              
              // Set user as online immediately on login
              updatePresence(data.user.id, true);
              
              set({
                isAuthenticated: true,
                user: data.user,
                company: data.company || null,
                sessionError: null,
              });
              return { success: true, user: data.user };
            }

            return { success: false, error: data.error || "Login failed" };
          } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: "An error occurred during login" };
          }
        },
        logout: (silent = false) => {
          const user = get().user;
          if (user?.id) {
            // Set user as offline on logout
            updatePresence(user.id, false);
            // Clear session only if not silent (silent = logged out by another device)
            if (!silent) {
              clearSession(user.id);
            }
          }
          // Clear local session storage
          if (typeof window !== "undefined") {
            localStorage.removeItem("sessionToken");
            localStorage.removeItem("sessionUserId");
          }
          set({ isAuthenticated: false, user: null, company: null });
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

// Role-based access helpers
export const useUserRole = (): UserRole | null => useAppStore((state) => state.user?.role ?? null);
export const useIsSuperAdmin = () => useAppStore((state) => state.user?.role === "superadmin");
export const useIsAdmin = () => useAppStore((state) => state.user?.role === "admin" || state.user?.role === "superadmin");
export const useCanManageUsers = () => useAppStore((state) => state.user?.role === "superadmin" || state.user?.role === "admin");
