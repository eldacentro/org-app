import { useEffect, useState } from 'react';

/**
 * La marca latiendo. Es LA pantalla de carga de la app: la que sale antes de
 * que React monte (escrita a pelo en `index.html`), la que sale mientras se
 * comprueban los interruptores de funciones, y la que sale mientras se abre la
 * sesión. Las tres tienen que ser la MISMA imagen, en el mismo sitio y del
 * mismo tamaño, o al arrancar se ve un salto que parece un fallo.
 *
 * Por eso el tamaño, la duración y los fotogramas de la animación están
 * duplicados a propósito en `index.html`: allí no se puede importar nada de
 * React, así que hay que repetirlos. **Si tocas los valores de aquí, toca los
 * de allí en el mismo commit.**
 *
 * Con `slowWarning`, a los 6 segundos aparece un aviso. La app se puede quedar
 * de verdad colgada en este logotipo si la llamada de arranque no vuelve (pasa
 * sin conexión, o con la red de un hotel de por medio), y sin esto no se
 * distingue de "va lento": el usuario se queda mirando un icono que respira,
 * sin saber si esperar o cerrar. No reintenta ni recarga solo — solo lo dice.
 *
 * Va apagado por defecto: solo tiene sentido en la pantalla de arranque a
 * pantalla completa. Metido dentro de una tarjeta —el aviso del modo de
 * prueba, por ejemplo— el texto se parte en una columna estrecha y estorba.
 */

const TAMANO = 80;
const AVISO_LENTO_MS = 6000;

const LottieLoader = ({
  size = TAMANO,
  message,
  slowWarning,
}: {
  size?: number;
  /** Qué se está haciendo. Sale bajo el logotipo desde el primer momento. */
  message?: string;
  /** Avisar a los 6 segundos. Solo para la pantalla completa. */
  slowWarning?: boolean;
}) => {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    if (!slowWarning) return;

    const id = setTimeout(() => setLento(true), AVISO_LENTO_MS);
    return () => clearTimeout(id);
  }, [slowWarning]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '0 24px',
      }}
    >
      <img
        src="/img/icon/isotipo.svg"
        alt="Elda Centro"
        style={{
          width: size,
          height: size,
          animation: 'eldaPulse 1.5s ease-in-out infinite',
        }}
      />

      {message && (
        <p
          className="body-small-regular"
          style={{ color: 'var(--grey-400)', margin: 0, textAlign: 'center' }}
        >
          {message}
        </p>
      )}

      {lento && (
        <p
          className="body-small-regular"
          style={{
            color: 'var(--grey-400)',
            margin: 0,
            textAlign: 'center',
            maxWidth: '280px',
          }}
        >
          Está tardando más de lo normal. Comprueba tu conexión.
        </p>
      )}

      <style>{`
        @keyframes eldaPulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LottieLoader;
