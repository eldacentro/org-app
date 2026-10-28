/**
 * Una espera que no puede quedarse colgada para siempre.
 *
 * Varias cosas de las que depende la conexión de la cuenta pueden no volver
 * NUNCA, sin fallar: pedirle el token a Firebase, retirar el aviso del móvil,
 * borrar una base de datos que otra pestaña tiene abierta… En el iPhone, con la
 * app instalada en la pantalla de inicio, es conocido que tras pasar un rato en
 * segundo plano el almacén del navegador (IndexedDB) pierde la conexión, y
 * cualquier cosa que lo toque se queda esperando hasta que se recarga la página.
 *
 * Desde fuera eso se veía como botones que «no hacen nada»: se pulsaba
 * «Reconectar» o «Cerrar sesión», la app se quedaba esperando a algo que no iba
 * a llegar, y no decía ni que estaba trabajando ni que se había rendido.
 *
 * Con esto la espera tiene fin: si no ha terminado en `ms`, se rechaza con un
 * `LimiteDeTiempo` y quien llama decide qué hacer — seguir con lo siguiente,
 * avisar, o recargar.
 */
export class LimiteDeTiempo extends Error {
  constructor(etiqueta: string, ms: number) {
    super(`${etiqueta}: sin respuesta en ${Math.round(ms / 1000)} s`);
    this.name = 'LimiteDeTiempo';
  }
}

export const conLimite = <T>(
  promesa: Promise<T>,
  ms: number,
  etiqueta = 'operación'
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const reloj = setTimeout(
      () => reject(new LimiteDeTiempo(etiqueta, ms)),
      ms
    );

    promesa.then(
      (valor) => {
        clearTimeout(reloj);
        resolve(valor);
      },
      (error) => {
        clearTimeout(reloj);
        reject(error);
      }
    );
  });

/**
 * Lo mismo, pero sin que importe cómo acabe: para los pasos que se intentan
 * por cortesía y no pueden frenar al siguiente (avisar al servidor al cerrar
 * sesión, por ejemplo). Devuelve `true` si terminó bien a tiempo.
 */
export const intentarConLimite = async (
  promesa: Promise<unknown>,
  ms: number,
  etiqueta = 'operación'
): Promise<boolean> => {
  try {
    await conLimite(promesa, ms, etiqueta);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
