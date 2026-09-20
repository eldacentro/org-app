import { ChangeEvent } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { ColorSchemeType } from '@definition/app';
import { appThemeNameState, colorSchemeState } from '@states/app';
import { syncStatusBarColor } from '@utils/common';

const useColorSchemeSelector = () => {
  const [colorScheme, setColorScheme] = useAtom(colorSchemeState);

  const theme = useAtomValue(appThemeNameState);

  const handleChangeColor = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedColor = e.target.value as ColorSchemeType;
    setColorScheme(selectedColor);

    const color = selectedColor;
    const newTheme = `${color}-${theme}`;

    document.documentElement.setAttribute('data-theme', newTheme);

    // La barra de estado del móvil también es de ese color: sin esto se
    // quedaba con el del tema anterior hasta reiniciar la app.
    syncStatusBarColor();
  };

  return { colorScheme, handleChangeColor };
};

export default useColorSchemeSelector;
