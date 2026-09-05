import { createContext, useContext } from "react";

// Session-level sidebar collapse state, shared between the app shell
// (AppLayout) and the Visit Wizard. Collapsing is a pure layout change —
// it never touches visit state, autosave, or navigation logic.
const SidebarContext = createContext({ collapsed: false, toggleCollapsed: () => {} });

export const SidebarProvider = SidebarContext.Provider;

export const useSidebar = () => useContext(SidebarContext);

export default SidebarContext;