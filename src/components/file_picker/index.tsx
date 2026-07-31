import { useRef, useCallback } from 'react';

/**
 * Elegir un fichero del dispositivo.
 *
 * ── Por qué es un hook y no un botón ─────────────────────────────────────
 *
 * Los siete sitios que piden un fichero lo enseñan de tres formas distintas, y
 * las tres están bien: en Documentos es un panel dentro de un formulario, en
 * Importar KML es un botón que además muestra el nombre elegido, y en Importar
 * .jwpub es una acción de la barra superior. Un componente único tendría que
 * saber pintar las tres, y acabaría siendo un botón con cinco props para
 * disfrazarlo.
 *
 * Lo que SÍ es igual en los siete —y lo que estaba mal en cuatro— es la
 * fontanería: el `<input type="file">` escondido, abrirlo desde otro control y,
 * sobre todo, VACIAR su valor después.
 *
 * ── Lo de vaciar el valor ────────────────────────────────────────────────
 *
 * Un `<input type="file">` solo avisa cuando su valor CAMBIA. Si eliges un
 * fichero, lo cancelas o falla, y vuelves a elegir EL MISMO, el valor es el que
 * ya había: no hay cambio, no hay aviso, y la aplicación se queda como si no
 * hubieras hecho nada. Pasaba en Documentos, en Importar .jwpub, en el CSV de
 * oradores y en Materiales de reunión — cuatro de los siete. Los otros tres lo
 * arreglaban a mano, cada uno por su cuenta.
 *
 * Aquí se vacía siempre, justo después de entregar el fichero.
 */
export const useFilePicker = ({
  accept,
  onFile,
  disabled,
}: {
  /** Igual que el atributo `accept`: ".pdf", "image/png,image/jpeg"… */
  accept?: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}) => {
  const ref = useRef<HTMLInputElement>(null);

  const abrir = useCallback(() => {
    if (disabled) return;
    ref.current?.click();
  }, [disabled]);

  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      disabled={disabled}
      style={{ display: 'none' }}
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Vaciar SIEMPRE, y antes de nada: si quien recibe el fichero lanza un
        // error o abre un diálogo, el input tiene que quedar limpio igual para
        // que el mismo fichero se pueda volver a elegir.
        e.target.value = '';
        if (file) onFile(file);
      }}
    />
  );

  return { abrir, input };
};

export default useFilePicker;
