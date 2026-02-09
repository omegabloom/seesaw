"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ViewModeContextType {
  isViewOpen: boolean;
  setIsViewOpen: (open: boolean) => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  isViewOpen: false,
  setIsViewOpen: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [isViewOpen, setIsViewOpen] = useState(false);

  return (
    <ViewModeContext.Provider value={{ isViewOpen, setIsViewOpen }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
