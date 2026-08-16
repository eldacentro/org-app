import { describe, expect, it } from 'vitest';
import {
  componerMensajeHojita,
  limpiarPasaje,
  limpiarTituloParte,
} from './mensaje_hojita';

/**
 * Se prueba porque este texto sale del teléfono sin que nadie lo revise.
 *
 * Y sobre todo por el ayudante: el fallo que hay que impedir no es un mensaje
 * feo, es uno que se lee por encima y hace que el hermano prepare una parte que
 * no es suya. Las comprobaciones de abajo son literalmente eso — que la palabra
 * «ayudante» esté en la primera línea y que el nombre de quien SÍ lleva la
 * parte aparezca.
 */
describe('el mensaje que va escrito en el chat', () => {
  const base = {
    nombre: 'Marcos',
    parte: '4',
    fecha: 'miércoles 3 de septiembre',
  };

  describe('al estudiante', () => {
    it('dice la parte, el día y la sala', () => {
      const mensaje = componerMensajeHojita({
        ...base,
        papel: 'estudiante',
        tituloParte: 'Empiece conversaciones',
        sala: 'sala auxiliar núm. 1',
      });

      expect(mensaje).toBe(
        'Hola, Marcos. ¿Qué tal?\n' +
          'Se te ha asignado la parte 4, «Empiece conversaciones», el miércoles 3 de septiembre, en la sala auxiliar núm. 1.\n' +
          'Te paso la hojita. ¡Gracias!'
      );
    });

    it('sin título de parte, el número basta', () => {
      const mensaje = componerMensajeHojita({ ...base, papel: 'estudiante' });

      expect(mensaje).toContain(
        'Se te ha asignado la parte 4 el miércoles 3 de septiembre.'
      );
      expect(mensaje).not.toContain('«');
    });

    it('con una sola sala no se menciona ninguna', () => {
      // Decir «en la sala principal» donde no hay otra es ruido.
      const mensaje = componerMensajeHojita({ ...base, papel: 'estudiante' });

      expect(mensaje).not.toContain('sala');
    });
  });

  describe('al ayudante', () => {
    const ayudante = {
      nombre: 'Javier',
      parte: '5',
      fecha: 'miércoles 3 de septiembre',
      papel: 'ayudante' as const,
      estudiante: 'Marcos Ruiz',
    };

    it('lo dice entero, y en este orden', () => {
      const mensaje = componerMensajeHojita({
        ...ayudante,
        tituloParte: 'Haga revisitas',
        sala: 'sala auxiliar núm. 1',
      });

      expect(mensaje).toBe(
        'Hola, Javier. ¿Qué tal?\n' +
          'Vas de *ayudante* de Marcos Ruiz el miércoles 3 de septiembre, en la parte 5, «Haga revisitas» (sala auxiliar núm. 1).\n' +
          'La parte la lleva Marcos Ruiz; tú le acompañas.\n' +
          'Te paso su hojita: tu nombre va en la línea de «Auxiliar». ¡Gracias!'
      );
    });

    it('«ayudante» va en el primer renglón después del saludo', () => {
      // Lo que se lee de un vistazo. Si esto se rompe al reordenar el mensaje,
      // el mensaje ha dejado de hacer su trabajo aunque siga diciendo lo mismo.
      const mensaje = componerMensajeHojita(ayudante);

      expect(mensaje.split('\n')[1]).toContain('*ayudante*');
    });

    it('va en negrita de WhatsApp, no en mayúsculas', () => {
      const mensaje = componerMensajeHojita(ayudante);

      expect(mensaje).toContain('*ayudante*');
      expect(mensaje).not.toContain('AYUDANTE');
    });

    it('nombra a quien sí lleva la parte, y dos veces', () => {
      // Una en la línea del papel y otra en la que lo dice sin rodeos.
      const mensaje = componerMensajeHojita(ayudante);

      expect(mensaje).toContain('de Marcos Ruiz');
      expect(mensaje).toContain('La parte la lleva Marcos Ruiz; tú le acompañas.');
    });

    it('nunca le dice que se le ha asignado la parte', () => {
      // Las dos fórmulas del mensaje del estudiante. Si alguna se cuela aquí,
      // el mensaje dice lo contrario de lo que pretende.
      const mensaje = componerMensajeHojita(ayudante);

      expect(mensaje).not.toContain('Se te ha asignado');
      expect(mensaje).not.toContain('tu parte');
    });

    it('sin el nombre del estudiante, sigue quedando claro que la parte no es suya', () => {
      // Pasa si al estudiante lo han borrado de la ficha. Antes que callarse
      // el papel, se dice sin nombre.
      const mensaje = componerMensajeHojita({
        ...ayudante,
        estudiante: undefined,
      });

      expect(mensaje.split('\n')[1]).toContain('*ayudante*');
      expect(mensaje).toContain('La parte no es tuya');
    });

    it('le dice en qué línea de la hojita está su nombre', () => {
      // La hoja impresa titula esa línea «Auxiliar:» —y más abajo pone «Sala
      // auxiliar núm. 1», con lo que la palabra vale para dos cosas en el mismo
      // papel—. El mensaje dice «ayudante» para no chocar con la sala, así que
      // tiene que decirle dónde mirar o le toca adivinar que ese es él.
      const mensaje = componerMensajeHojita(ayudante);

      expect(mensaje).toContain('su hojita');
      expect(mensaje).toContain('«Auxiliar»');
    });
  });
});

describe('lo que el material trae pegado al título', () => {
  it('quita el número que el material pone delante', () => {
    // Se vio en pantalla: «la parte 4, "4. Empiece conversaciones"».
    expect(limpiarTituloParte('4. Empiece conversaciones')).toBe(
      'Empiece conversaciones'
    );
    expect(limpiarTituloParte('3. Lectura de la Biblia')).toBe(
      'Lectura de la Biblia'
    );
  });

  it('deja intacto un título que no lo lleva', () => {
    expect(limpiarTituloParte('Empiece conversaciones')).toBe(
      'Empiece conversaciones'
    );
  });

  it('sin título, no se inventa uno', () => {
    expect(limpiarTituloParte(undefined)).toBeUndefined();
    expect(limpiarTituloParte('')).toBeUndefined();
    expect(limpiarTituloParte('  ')).toBeUndefined();
    // Un título que era SOLO el número no deja nada que decir.
    expect(limpiarTituloParte('4.')).toBeUndefined();
  });

  it('del pasaje se queda solo el pasaje', () => {
    expect(limpiarPasaje('Jer 24:1-10 (th lección 5).')).toBe('Jer 24:1-10');
    expect(limpiarPasaje('Pr 30:1-14.')).toBe('Pr 30:1-14');
  });

  it('un pasaje vacío no se convierte en comillas vacías', () => {
    expect(limpiarPasaje(undefined)).toBeUndefined();
    expect(limpiarPasaje('(th lección 5).')).toBeUndefined();
  });
});
