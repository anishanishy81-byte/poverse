import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { User, UserRole, Company } from "@/types/auth";
import { updatePresence } from "@/lib/chat";

interface AppState {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  company: Company | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  setCompany: (company: Company | null) => void;
  
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

        // Auth
        isAuthenticated: false,
        user: null,
        company: null,
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
              // Set user as online immediately on login
              updatePresence(data.user.id, true);
              
              set({
                isAuthenticated: true,
                user: data.user,
                company: data.company || null,
              });
              return { success: true, user: data.user };
            }

            return { success: false, error: data.error || "Login failed" };
          } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: "An error occurred during login" };
          }
        },
        logout: () => {
          const user = get().user;
          if (user?.id) {
            // Set user as offline on logout
            updatePresence(user.id, false);
          }
          set({ isAuthenticated: false, user: null, company: null });
        },
        setCompany: (company) => set({ company }),

        // UI State
        isSidebarOpen: true,
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      }),
      {
        name: "app-storage",
        partialize: (state) => ({
          isDarkMode: state.isDarkMode,
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          company: state.company,
        }),
      }
    )
  )
);

// Selectors for performance optimization
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
