import type { ReactNode } from 'react';

import { ThemeContext, useAppTheme, type Theme } from './index';

type Props = {
  children: ReactNode;
  /** Forces a theme. Used by the design screen, not by the app. */
  value?: Theme;
};

export function ThemeProvider({ children, value }: Props) {
  const theme = useAppTheme();

  return <ThemeContext.Provider value={value ?? theme}>{children}</ThemeContext.Provider>;
}
