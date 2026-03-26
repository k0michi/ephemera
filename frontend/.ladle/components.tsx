import type { GlobalProvider } from "@ladle/react";
import { MemoryRouter } from "react-router";
import { EphemeraStoreContext } from "../app/store";

export const Provider: GlobalProvider = ({ children }) => {
  return <MemoryRouter>
    <EphemeraStoreContext.Provider>
      {children}
    </EphemeraStoreContext.Provider>
  </MemoryRouter>;
};