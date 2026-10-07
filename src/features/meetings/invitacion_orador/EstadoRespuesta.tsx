import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import Badge from '@components/badge';
import { congIDState } from '@states/settings';
import { SpeakerInvitationType } from '@definition/speaker_invitation';
import { buscarInvitacion } from '@services/firebase/speaker_invitations';

/**
 * Qué ha contestado el orador, al lado de su nombre.
 *
 * Es la mitad del trabajo que se hacía a mano: saber si viene y si se queda a
 * cenar sin tener que acordarse de mirar el correo. Mientras no haya contestado
 * no se dice nada — una etiqueta de «sin respuesta» en cada semana sin invitar
 * sería ruido en toda la pantalla.
 */
const EstadoRespuesta = ({
  weekOf,
  speakerUid,
}: {
  weekOf: string;
  speakerUid?: string;
}) => {
  const congId = useAtomValue(congIDState);

  const [invitacion, setInvitacion] = useState<SpeakerInvitationType | null>(
    null
  );

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!congId || !speakerUid) {
        setInvitacion(null);
        return;
      }

      try {
        const dato = await buscarInvitacion(congId, weekOf, speakerUid);

        if (!cancelado) setInvitacion(dato);
      } catch (error) {
        console.error('No se pudo leer la invitación del orador', error);
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [congId, weekOf, speakerUid]);

  if (!invitacion) return null;

  const respuesta = invitacion.respuesta;

  // Mandada pero sin contestar. Esto SÍ se dice: es lo que hay que perseguir.
  if (!respuesta) {
    return <Badge size="small" color="grey" text="Invitación sin contestar" />;
  }

  if (!respuesta.asistira) {
    return <Badge size="small" color="red" filled text="No podrá venir" />;
  }

  return (
    <Badge
      size="small"
      color="green"
      text={
        respuesta.cena
          ? `Confirmado · cena para ${respuesta.comensales}`
          : 'Confirmado · sin cena'
      }
    />
  );
};

export default EstadoRespuesta;
