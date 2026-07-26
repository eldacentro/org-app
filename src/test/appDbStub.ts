/**
 * Doble de la base de datos local para las pruebas.
 *
 * Solo existe para que se puedan importar módulos que traen `appDb` por
 * arriba pero cuya lógica probada no la toca (funciones puras de cálculo). Si
 * una prueba llega a usar esto de verdad, fallará con un error claro en vez de
 * dar un resultado inventado.
 */
const noDb = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        `La prueba ha intentado usar la base de datos local ("${String(prop)}"). ` +
          'Estas pruebas solo cubren lógica pura: extrae la función o pasa los datos por parámetro.'
      );
    },
  }
);

export default noDb;
