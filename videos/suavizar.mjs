/**
 * DE LOS FOTOGRAMAS IRREGULARES A 60 POR SEGUNDO, LIMPIOS.
 *
 * Chrome emite el screencast cuando le parece —unos 11 por segundo, y a
 * ráfagas—. En un plano cerrado eso se ve a tirones.
 *
 * Aquí se hacen dos cosas: primero se respeta el TIEMPO REAL de cada
 * fotograma (con sus duraciones desiguales, sacadas de marcas.json), y
 * después se interpolan los que faltan estimando el movimiento entre
 * fotogramas consecutivos. Es lo mismo que hace Pixel Motion en After
 * Effects: inventar los intermedios en vez de repetir el anterior.
 *
 *   node suavizar.mjs informe
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const toma = process.argv[2] ?? 'informe';
const dir = new URL(`./tomas/${toma}/`, import.meta.url).pathname;

const datos = JSON.parse(await readFile(`${dir}marcas.json`, 'utf8'));
const { tiempos, fotogramas } = datos;

// Lista para ffmpeg con la duración real de cada fotograma.
const lineas = [];
for (let i = 0; i < fotogramas; i++) {
  const dur = i < fotogramas - 1 ? tiempos[i + 1] - tiempos[i] : 0.1;
  lineas.push(`file '${dir}${String(i).padStart(4, '0')}.jpg'`);
  lineas.push(`duration ${Math.max(0.008, dur).toFixed(4)}`);
}
lineas.push(`file '${dir}${String(fotogramas - 1).padStart(4, '0')}.jpg'`);
await writeFile(`${dir}lista.txt`, lineas.join('\n'));

await ejecutar('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', `${dir}lista.txt`,
  // `mi_mode=mci` estima el movimiento entre fotogramas e inventa los de en
  // medio. Sin esto solo se repetiría el anterior y seguiría a tirones.
  '-vf', 'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir',
  '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  `${dir}suave.mp4`,
]);

const { stdout } = await ejecutar('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=nb_frames,width,height', '-of', 'csv=p=0',
  `${dir}suave.mp4`,
]);

console.log(`  ✓ ${toma}: ${fotogramas} fotogramas → ${stdout.trim()} a 60 fps`);
