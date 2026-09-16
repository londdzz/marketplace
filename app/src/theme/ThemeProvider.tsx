import type { ReactNode } from 'react';

import { ThemeContext, useSystemTheme, type Theme } from './index';

type Props = {
  children: ReactNode;
  /** Forces a theme. Used by the screenshot harness, not by the app. */
  value?: Theme;
};

export function ThemeProvider({ children, value }: Props) {
  const system = useSystemTheme();

  return <ThemeContext.Provider value={value ?? system}>{children}</ThemeContext.Provider>;
}
