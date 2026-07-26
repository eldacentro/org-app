/**
 * "Hace cuánto" en palabras, a partir de minutos.
 *
 * La marca de la última sincronización ya se conserva entre recargas, así que
 * ahora puede valer días — y "Sincronizado hace 4320 minutos" no lo entiende
 * nadie. Se usa tanto en el menú de la cuenta como en el aviso de datos sin
 * sincronizar, para que ambos digan lo mismo.
 */
export const formatSyncAge = (minutes: number) => {
  if (minutes < 60) {
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 48) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }

  const days = Math.floor(hours / 24);
  return `${days} días`;
};
