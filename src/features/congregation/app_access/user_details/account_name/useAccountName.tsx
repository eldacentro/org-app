import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { personsActiveState } from '@states/persons';
import { userIDState } from '@states/app';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import useUserDetails from '../useUserDetails';

/**
 * El nombre de una cuenta, corregido por quien administra.
 *
 * Cada hermano puede cambiar su nombre en Mi cuenta, y a veces se equivoca o lo
 * escribe de otra manera. Aquí un administrador lo deja como debe ser, y le
 * llega a su app: el servidor ya guardaba este cambio, y desde sws2apps-api
 * ya no lo pisa el móvil del hermano al subir un nombre más viejo (gana el más
 * nuevo, como en el resto de la sincronización).
 *
 * Se guarda con un botón y no al salir del campo, a propósito: son dos campos,
 * y guardar al salir de cada uno mandaba dos cambios seguidos; el segundo se
 * perdía si el primero no había terminado, y no lo decía nadie.
 */
const useAccountName = () => {
  const { handleSaveDetails, currentUser, isProcessing } = useUserDetails();

  const userID = useAtomValue(userIDState);
  const personsActive = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const guardadoNombre = currentUser?.profile.firstname?.value ?? '';
  const guardadoApellidos = currentUser?.profile.lastname?.value ?? '';

  const [nombre, setNombre] = useState(guardadoNombre);
  const [apellidos, setApellidos] = useState(guardadoApellidos);

  // Lo guardado manda al abrir otra cuenta y después de guardar. Mientras se
  // escribe no cambia nada de esto, así que no borra lo que se está tecleando.
  useEffect(() => {
    setNombre(guardadoNombre);
    setApellidos(guardadoApellidos);
  }, [currentUser?.id, guardadoNombre, guardadoApellidos]);

  const cambiado =
    nombre.trim() !== guardadoNombre || apellidos.trim() !== guardadoApellidos;

  /**
   * El nombre de su ficha en Personas, si la cuenta está vinculada y se llama
   * distinto. Vincular una cuenta ya le copia ese nombre; esto es para las que
   * se vincularon antes y luego alguien cambió uno de los dos.
   */
  const ficha = useMemo(() => {
    const uid = currentUser?.profile.user_local_uid;

    if (!uid) return null;

    const persona = personsActive.find((record) => record.person_uid === uid);

    if (!persona) return null;

    const firstname = persona.person_data.person_firstname.value.trim();
    const lastname = persona.person_data.person_lastname.value.trim();

    if (!firstname) return null;

    if (firstname === guardadoNombre && lastname === guardadoApellidos) {
      return null;
    }

    return {
      firstname,
      lastname,
      completo: buildPersonFullname(lastname, firstname, fullnameOption),
    };
  }, [
    currentUser?.profile.user_local_uid,
    personsActive,
    guardadoNombre,
    guardadoApellidos,
    fullnameOption,
  ]);

  const handleDeshacer = () => {
    setNombre(guardadoNombre);
    setApellidos(guardadoApellidos);
  };

  const handleUsarFicha = () => {
    if (!ficha) return;

    // Solo rellena: se guarda con el botón, para poder mirarlo antes.
    setNombre(ficha.firstname);
    setApellidos(ficha.lastname);
  };

  const handleGuardar = async () => {
    if (!currentUser || isProcessing) return;

    const limpioNombre = nombre.trim();
    const limpioApellidos = apellidos.trim();

    // Una cuenta sin nombre no se guarda: se vuelve a lo que había.
    if (!limpioNombre) {
      handleDeshacer();
      return;
    }

    if (
      limpioNombre === guardadoNombre &&
      limpioApellidos === guardadoApellidos
    ) {
      // Solo sobraban espacios: se enseña limpio y no se manda nada.
      handleDeshacer();
      return;
    }

    const ahora = new Date().toISOString();

    const newUser = structuredClone(currentUser);
    newUser.profile.firstname = { value: limpioNombre, updatedAt: ahora };
    newUser.profile.lastname = { value: limpioApellidos, updatedAt: ahora };

    try {
      await handleSaveDetails(newUser);

      // Tu propia cuenta: se ve ya en Mi cuenta, sin esperar a sincronizar.
      if (userID === currentUser.id) {
        await dbAppSettingsUpdate({
          'user_settings.firstname': { value: limpioNombre, updatedAt: ahora },
          'user_settings.lastname': {
            value: limpioApellidos,
            updatedAt: ahora,
          },
        });
      }
    } catch (error) {
      console.error(error);

      handleDeshacer();

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode((error as Error).message),
        severity: 'error',
      });
    }
  };

  return {
    nombre,
    apellidos,
    setNombre,
    setApellidos,
    cambiado,
    ficha,
    isProcessing,
    handleGuardar,
    handleDeshacer,
    handleUsarFicha,
  };
};

export default useAccountName;
