import { decryptData } from '@services/encryption';
import { TABLE_ENCRYPTION_MAP } from '@constants/table_encryption_map';

/**
 * EL INFORME QUE LLEGABA CIFRADO DOS VECES.
 *
 * `encryptObject` cifra el objeto que recibe EN SU SITIO. Al enviar su informe,
 * el publicador lo ciframos y, si el envío fallaba por la red —o tardaba más de
 * 20 s, que en un servidor recién despertado pasa—, se guardaba en la cola de
 * reintento ese mismo objeto, YA cifrado. Al reintentar se volvía a cifrar.
 *
 * El secretario lo descifra una vez y le quedaban textos cifrados donde iban
 * los datos. El peor: `_deleted`, que como texto cuenta como «verdadero», así
 * que el informe se tomaba por RETIRADO y no entraba — o borraba el que ya
 * hubiera. Quien lo mandó veía «enviado» y al secretario no le llegaba nada.
 * Pasaba sobre todo con los que se mandan a deshoras, como el último día del
 * mes por la noche, cuando el servidor está dormido y tarda en contestar.
 *
 * Esto deshace las vueltas de cifrado que sobren. Se usa en los dos lados: en
 * la cola, por los informes que ya se quedaron guardados así en algún móvil, y
 * en el secretario, por si llega alguno de una versión vieja de la app.
 */

/** Así empieza todo lo que cifra CryptoJS con contraseña: «Salted__» en base64. */
const PREFIJO_CIFRADO = 'U2FsdGVkX1';

const CAMPOS = Object.keys(TABLE_ENCRYPTION_MAP.incoming_reports);

const pareceCifrado = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.startsWith(PREFIJO_CIFRADO);

export const quitarCifradoSobrante = <T extends object>(
  informe: T,
  accessCode: string
): T => {
  const datos = informe as Record<string, unknown>;

  for (const campo of CAMPOS) {
    // Nunca hacen falta más de un par de vueltas; el tope es por si acaso.
    for (let vuelta = 0; vuelta < 3 && pareceCifrado(datos[campo]); vuelta++) {
      try {
        datos[campo] = JSON.parse(
          decryptData(datos[campo] as string, accessCode, campo, 'incoming_reports')
        );
      } catch {
        // Un texto que solo PARECE cifrado (o con otra clave): se deja como
        // está antes que perder el informe entero.
        break;
      }
    }
  }

  return informe;
};
