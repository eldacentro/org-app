import { useAtom } from 'jotai';
import { avisarAyudantesState } from '@states/schedules';
import { cookiesConsentState } from '@states/app';
import { useAtomValue } from 'jotai';
import SwitchWithLabel from '@components/switch_with_label';

/**
 * Avisar también al ayudante de cada parte.
 *
 * Va en el engranaje y no en la barra de abajo porque cambia CÓMO funciona la
 * pantalla, no actúa sobre el contenido (DESIGN_SYSTEM §6.4a).
 *
 * Es un ajuste de este dispositivo, no de la congregación: es la costumbre de
 * quien reparte las hojitas. Se guarda igual que la plantilla de S-89 —en
 * `localStorage`, y solo si se aceptaron las cookies—, así que no toca nada de
 * lo que se sincroniza.
 */
const AvisarAyudantes = () => {
  const [avisar, setAvisar] = useAtom(avisarAyudantesState);
  const cookiesConsent = useAtomValue(cookiesConsentState);

  const handleToggle = () => {
    const valor = !avisar;

    setAvisar(valor);

    if (cookiesConsent) {
      localStorage.setItem('organized_avisar_ayudantes', String(valor));
    }
  };

  return (
    <SwitchWithLabel
      label="Avisar también a los ayudantes"
      helper="Añade una fila por cada ayudante de «Seamos mejores maestros», con un mensaje que deja claro que la parte no es suya."
      checked={avisar}
      onChange={handleToggle}
    />
  );
};

export default AvisarAyudantes;
