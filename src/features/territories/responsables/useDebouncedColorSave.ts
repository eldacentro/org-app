import { useEffect, useRef, useState } from 'react';
import { displaySnackNotification } from '@services/states/app';

/**
 * Color pendiente local + guardado con debounce — antes DialogZonas y
 * DialogEtiquetas reimplementaban exactamente esta misma lógica cada uno
 * (mismo patrón de pendingColors/colorTimers, mismo debounce de 600ms,
 * mismo manejo de error). El estado local evita el "snapback" visual del
 * color mientras el usuario sigue arrastrando el selector, antes de que la
 * escritura a Firestore se confirme.
 */
export const useDebouncedColorSave = <T extends { id: string; color: string }>(
  saveFn: (item: T, color: string) => Promise<void>,
  errorMessage: string
) => {
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Limpiar los timers pendientes al desmontar para no llamar setState
  // sobre un componente ya desmontado.
  useEffect(() => {
    const timersRef = timers;
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  const getColor = (item: T) => pendingColors[item.id] ?? item.color;

  const handleColorChange = (item: T, newColor: string) => {
    setPendingColors((prev) => ({ ...prev, [item.id]: newColor }));

    if (timers.current[item.id]) clearTimeout(timers.current[item.id]);
    timers.current[item.id] = setTimeout(async () => {
      try {
        await saveFn(item, newColor);
        setPendingColors((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      } catch (err) {
        console.error(err);
        displaySnackNotification({ severity: 'error', header: 'Error', message: errorMessage });
        setPendingColors((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
    }, 600);
  };

  // Antes solo limpiaba `pendingColors` (el color que se ve en pantalla),
  // pero dejaba correr los timers ya armados — así que si el diálogo se
  // cerraba y volvía a abrir justo tras cambiar un color, ese color se
  // guardaba igual 600ms después aunque el usuario ya había "reseteado".
  const reset = () => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setPendingColors({});
  };

  return { getColor, handleColorChange, reset };
};
