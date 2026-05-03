import { createContext, useContext, useState, ReactNode } from "react";

interface NumberVisibilityContextType {
  visible: boolean;
  toggle: () => void;
  mask: (value: string) => string;
}

const NumberVisibilityContext = createContext<NumberVisibilityContextType>({
  visible: false,
  toggle: () => {},
  mask: () => "••••",
});

export const useNumberVisibility = () => useContext(NumberVisibilityContext);

export const NumberVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((v) => !v);
  const mask = (value: string) => (visible ? value : "••••••");

  return (
    <NumberVisibilityContext.Provider value={{ visible, toggle, mask }}>
      {children}
    </NumberVisibilityContext.Provider>
  );
};
