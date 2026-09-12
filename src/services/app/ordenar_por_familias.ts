import type { PersonType } from '@definition/person';

/**
 * Pone juntas a las familias dentro de una lista de personas.
 *
 * Es para el PDF de Contactos de emergencia, y SOLO para eso. Ahí, en una
 * urgencia, se busca a una familia: ver al cabeza y a los suyos seguidos es
 * más rápido que encontrarlos repartidos por la hoja. En Grupos de predicación
 * el orden es el que el superintendente de grupo pone a mano (`sort_index`), y
 * ese se queda como está.
 *
 * Cómo ordena:
 *
 * · Una familia se guarda en su CABEZA: `family_members.members` es la lista
 *   de los demás. Sale primero el cabeza y detrás los suyos, en el orden en que
 *   los apuntó.
 * · Cada familia se coloca donde aparecía el PRIMERO de sus miembros en la
 *   lista que llega. Quien no tiene familia se queda en su sitio relativo.
 * · Una familia dentro de otra (un hijo que ya es cabeza de la suya) sigue a su
 *   cabeza, con los suyos detrás.
 * · No saca a nadie de la lista ni mete a nadie de fuera. Si el cabeza está en
 *   otro grupo, los de esta lista siguen saliendo juntos, pero nadie cambia de
 *   hoja.
 *
 * Y lo que no puede pasar nunca, con datos raros incluidos (alguien apuntado en
 * dos familias, una familia que se apunta a sí misma, un ciclo): que alguien
 * se pierda o salga dos veces. Cada persona que entra sale exactamente una vez.
 */
export const ordenarPorFamilias = (
  personas: PersonType[],
  todas: PersonType[]
): PersonType[] => {
  // De cada cabeza, los suyos; y de cada uno, quién es su cabeza.
  const miembrosDe = new Map<string, string[]>();
  const cabezaDe = new Map<string, string>();

  for (const persona of todas ?? []) {
    const lista = persona?.person_data?.family_members?.members;

    if (!Array.isArray(lista) || lista.length === 0) continue;

    const cabeza = persona.person_uid;

    const suyos = [...new Set(lista)].filter(
      (uid) => typeof uid === 'string' && uid !== cabeza
    );

    miembrosDe.set(cabeza, suyos);

    for (const uid of suyos) {
      // Apuntado en dos familias: manda la primera que se encuentra.
      if (!cabezaDe.has(uid)) cabezaDe.set(uid, cabeza);
    }
  }

  // El cabeza de más arriba: el hijo que es cabeza de la suya sube hasta su
  // padre. Con freno por si los datos traen un ciclo.
  const raizDe = (uid: string) => {
    const vistos = new Set([uid]);
    let actual = uid;

    for (;;) {
      const siguiente = cabezaDe.get(actual);

      if (!siguiente || vistos.has(siguiente)) return actual;

      vistos.add(siguiente);
      actual = siguiente;
    }
  };

  const presentes = new Map<string, PersonType>();

  for (const persona of personas ?? []) {
    if (persona?.person_uid) presentes.set(persona.person_uid, persona);
  }

  const resultado: PersonType[] = [];
  const colocados = new Set<string>();

  const colocar = (uid: string) => {
    const persona = presentes.get(uid);

    if (!persona || colocados.has(uid)) return;

    colocados.add(uid);
    resultado.push(persona);
  };

  // Recorre la familia desde su cabeza: el cabeza, cada uno de los suyos y, si
  // alguno es cabeza a su vez, los de ese detrás de él. Coloca solo a quien
  // está en la lista; pasa por los demás para llegar a sus familiares.
  const recorrer = (uid: string, vistos: Set<string>) => {
    if (vistos.has(uid)) return;

    vistos.add(uid);
    colocar(uid);

    for (const suyo of miembrosDe.get(uid) ?? []) recorrer(suyo, vistos);
  };

  for (const persona of personas ?? []) {
    const uid = persona?.person_uid;

    if (!uid || colocados.has(uid)) continue;

    recorrer(raizDe(uid), new Set());

    // Red de seguridad: con cualquier dato imposible que no haya previsto,
    // la persona sale igual en su sitio en vez de perderse.
    colocar(uid);
  }

  return resultado;
};
