import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { saveAs } from 'file-saver';
import writeXlsxFile, { Row, SheetData } from 'write-excel-file/browser';
import Papa from 'papaparse';
import { congNameState } from '@states/settings';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryZonesSortedState,
  territorySettingsState,
} from '@states/territories';
import {
  formatTerritoryDate,
  getZoneName,
  serviceYearRange,
  territoryLabel,
} from '@services/app/territories';
import { territoriesToKml } from '@utils/kml';
import { usePersonName } from '@features/territories/usePersonName';
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { nombreArchivo } from '@utils/nombre_pdf';

const S13_DATE = 'dd-MM-yyyy';
const ROWS_PER_SHEET = 20;
/** Columnas de asignación que tiene físicamente cada fila del S-13. */
const S13_SLOTS = 4;

// Coordenadas y layout para la plantilla original — medidas directamente
// del flujo de contenido del PDF original (public/pdf/S-13_S.pdf), no a
// ojo: se extrajeron las 20 líneas divisorias reales de la tabla y se
// promedió su separación. La altura real es 31.32pt, no 31.743pt — esa
// diferencia de ~0.42pt por fila es lo que causaba el desfase acumulado
// (para la fila 20, ya eran casi 8pt de diferencia).
const PAGE_HEIGHT = 842.04;
const ROW_START_Y = 695.59; // Borde superior de la fila 1 (desde abajo)
const ROW_HEIGHT = 31.32; // Alto exacto de cada fila
// Baselines — recalibrados para que la fila 1 quede exactamente donde ya
// estaba (confirmado correcto), ahora medidos desde el ROW_START_Y real.
const BASELINE_TOP = 8.87; // Desde el borde superior de la fila hasta el texto del nombre/num
const BASELINE_BOTTOM = 23.87; // Desde el borde superior de la fila hasta el texto de fechas

const COL_NUM_X = 55; // Centro de Núm. de terr.
const COL_DATE_X = 105; // Centro de Última fecha
const COL_GROUPS_X = [135, 241.6, 348.2, 454.8]; // Borde izquierdo de cada grupo
const GROUP_WIDTH = 106.6;
const HALF_GROUP = GROUP_WIDTH / 2;

/**
 * ¿Se puede escribir este texto con las fuentes estándar del PDF?
 *
 * Las base-14 (Helvetica y compañía) solo hablan WinAnsi/cp1252: latín
 * occidental completo — tildes, ñ, ü, ç…— pero nada de ł, ș, ț, ř o ě. Si se
 * les pasa uno de esos, pdf-lib LANZA, así que hay que preguntarlo antes.
 */
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const isWinAnsi = (text: string) =>
  [...text].every((ch) => {
    const c = ch.codePointAt(0)!;
    return (
      (c >= 0x20 && c <= 0x7e) ||
      (c >= 0xa0 && c <= 0xff) ||
      WIN_ANSI_EXTRA.includes(ch)
    );
  });

export type ExcelFilter = 'all' | 'assigned' | 'unassigned' | 'campaigns';

export const useTerritoryExport = () => {
  const congName = useAtomValue(congNameState);
  const zones = useAtomValue(territoryZonesSortedState);
  const territories = useAtomValue(territoriesState);
  const assignments = useAtomValue(territoryAssignmentsState);
  const settings = useAtomValue(territorySettingsState);
  const resolveName = usePersonName();

  const safeName = (congName || 'congregacion').replace(/\s+/g, '_');

  // ── S-13 (PDF) — réplica con pdf-lib sobre plantilla original ──
  const exportS13 = useCallback(
    async (refDate: Date, includeCampaigns: boolean) => {
      const { start, end } = serviceYearRange(refDate);
      const startYear = String(end.getFullYear());

      const inServiceYear = (a: (typeof assignments)[number]) => {
        const assigned = new Date(a.assignedAt);
        const returned = a.returnedAt ? new Date(a.returnedAt) : null;
        const assignedIn = assigned >= start && assigned < end;
        const returnedIn = !!returned && returned >= start && returned < end;
        const spanning = assigned < start && (!returned || returned >= end);
        return assignedIn || returnedIn || spanning;
      };

      // Preparar datos
      const sheetsData: {
        zoneName: string;
        continuation: boolean;
        rows: {
          numero: string;
          lastCompleted: string;
          assignments: {
            name: string;
            dateAssigned: string;
            dateCompleted: string;
          }[];
        }[];
      }[] = [];
      let continuedTerritories = 0;

      zones.forEach((zone) => {
        const zoneTerritories = territories
          .filter((t) => t.zoneId === zone.id)
          .sort((a, b) =>
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        if (zoneTerritories.length === 0) return;

        // Cada territorio produce UNA O MÁS filas: la plantilla solo tiene 4
        // columnas de asignación, y el propio formulario indica cómo
        // continuar — "cuando comience una página nueva, anote en esta
        // columna la última fecha en que se completó el territorio". Así
        // que en vez de descartar lo que no cabe (antes se perdían las
        // asignaciones más antiguas del año), se reparte en tandas de 4 y
        // cada tanda arrastra la última fecha completada de lo anterior.
        const rowsPerTerritory = zoneTerritories.map((t) => {
          const allAssignmentsSorted = assignments
            .filter((a) => a.territoryId === t.id)
            .filter((a) => includeCampaigns || !a.isCampaign)
            .sort(
              (x, y) =>
                new Date(x.assignedAt).getTime() -
                new Date(y.assignedAt).getTime()
            );
          const yearAssignments = allAssignmentsSorted.filter(inServiceYear);

          /**
           * "Última fecha en que se completó" para una tanda: la fecha de
           * finalización MÁS RECIENTE de todo lo anterior a esa tanda. Solo
           * cuentan las devoluciones como trabajado — un territorio devuelto
           * sin trabajar no se "completó". Si `firstOfChunk` es undefined se
           * mira todo el historial (territorio sin asignaciones este año).
           */
          const lastCompletedBefore = (
            firstOfChunk?: (typeof allAssignmentsSorted)[number]
          ): string => {
            const anchor = firstOfChunk
              ? allAssignmentsSorted.findIndex((a) => a.id === firstOfChunk.id)
              : allAssignmentsSorted.length;
            const prior = allAssignmentsSorted
              .slice(0, Math.max(anchor, 0))
              .filter((a) => a.returnedAt && a.status === 'trabajado');
            if (prior.length === 0) return '';
            const last = prior.reduce((best, a) =>
              new Date(a.returnedAt!) > new Date(best.returnedAt!) ? a : best
            );
            return formatTerritoryDate(last.returnedAt!, S13_DATE);
          };

          const toRow = (
            chunk: typeof allAssignmentsSorted,
            firstOfChunk?: (typeof allAssignmentsSorted)[number]
          ) => ({
            numero: t.numero,
            lastCompleted: lastCompletedBefore(firstOfChunk),
            assignments: chunk.map((a) => ({
              name: resolveName(a.personUid) + (a.isCampaign ? ' (C)' : ''),
              dateAssigned: formatTerritoryDate(a.assignedAt, S13_DATE),
              dateCompleted: a.returnedAt
                ? formatTerritoryDate(a.returnedAt, S13_DATE)
                : '',
            })),
          });

          // Sin asignaciones este año: la fila va vacía, pero conservando la
          // última fecha en que se completó (que puede ser de años atrás).
          if (yearAssignments.length === 0) return [toRow([], undefined)];

          const chunks: (typeof allAssignmentsSorted)[] = [];
          for (let i = 0; i < yearAssignments.length; i += S13_SLOTS) {
            chunks.push(yearAssignments.slice(i, i + S13_SLOTS));
          }
          if (chunks.length > 1) continuedTerritories += 1;
          return chunks.map((chunk) => toRow(chunk, chunk[0]));
        });

        // Primero una fila por territorio (la hoja normal); después, hojas
        // de continuación solo con los territorios que necesitaron más de 4
        // columnas. Así cada hoja mantiene "un territorio por fila", que es
        // como está pensado el formulario para leerse.
        const passes = Math.max(...rowsPerTerritory.map((r) => r.length), 1);
        for (let pass = 0; pass < passes; pass++) {
          const passRows = rowsPerTerritory
            .map((rows) => rows[pass])
            .filter((r): r is NonNullable<typeof r> => Boolean(r));
          for (let i = 0; i < passRows.length; i += ROWS_PER_SHEET) {
            sheetsData.push({
              zoneName: zone.nombre,
              continuation: pass > 0,
              rows: passRows.slice(i, i + ROWS_PER_SHEET),
            });
          }
        }
      });

      if (sheetsData.length === 0) return;

      // Cargar plantilla base
      const templateRes = await fetch('/pdf/S-13_S.pdf');
      const templateBytes = await templateRes.arrayBuffer();

      const doc = await PDFDocument.create();
      const baseDoc = await PDFDocument.load(templateBytes);

      // ── Fuentes ────────────────────────────────────────────────────────
      // El impreso oficial está compuesto en Arial, así que lo que se rellena
      // encima tiene que ser Arial también: si no, el formulario sale con dos
      // tipografías distintas y se nota a la legua. Helvetica es la base-14
      // del PDF métricamente equivalente a Arial y no pesa NADA (no se
      // embebe): el visor usa la del sistema, la misma que ya usa la
      // plantilla. Es lo que hacía la primera versión y por eso se veía bien.
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      // Pero Helvetica solo habla cp1252, y un apellido con ł, ș, ț, ă, ć o ř
      // hacía que pdf-lib lanzara y se perdiera la exportación ENTERA por el
      // nombre de un solo hermano. Por eso hay una fuente Unicode de
      // repuesto — que solo se descarga y se embebe si de verdad hace falta,
      // así que en el caso normal (todo latín occidental) el PDF sale ligero
      // y con la letra del impreso, y en el caso raro el nombre se lee bien
      // aunque cambie ligeramente de tipografía. Mejor eso que no salir.
      const needsUnicode = sheetsData.some(
        (s) =>
          !isWinAnsi(s.zoneName) ||
          s.rows.some(
            (r) =>
              !isWinAnsi(r.numero) ||
              r.assignments.some((a) => !isWinAnsi(a.name))
          )
      );

      let uniFont: PDFFont | null = null;
      let uniFontBold: PDFFont | null = null;
      if (needsUnicode) {
        doc.registerFontkit(fontkit);
        const [regularBytes, semiBoldBytes] = await Promise.all([
          fetch('/assets/fonts/NotoSans-Regular.ttf').then((r) =>
            r.arrayBuffer()
          ),
          fetch('/assets/fonts/NotoSans-SemiBold.ttf').then((r) =>
            r.arrayBuffer()
          ),
        ]);
        // SIN `subset: true`. Recortar la fuente a los caracteres usados deja
        // el PDF mucho más ligero, pero con estas páginas —copiadas de la
        // plantilla y con cientos de textos— pdf-lib genera un subconjunto
        // incompleto: en el S-13 salían nombres y fechas a los que les
        // faltaba la mayoría de las letras ("He y A" en vez del nombre, "6"
        // en vez de "25-06-2026"). Comprobado renderizando el PDF con las dos
        // opciones.
        uniFont = await doc.embedFont(regularBytes);
        uniFontBold = await doc.embedFont(semiBoldBytes);
      }

      /** Helvetica salvo que el texto tenga letras que no admite. */
      const pickFont = (text: string, bold = false): PDFFont => {
        if (uniFont && !isWinAnsi(text)) return bold ? uniFontBold! : uniFont;
        return bold ? fontBold : font;
      };

      for (const sheet of sheetsData) {
        // Por cada "sheet", creamos una página nueva clonando la base
        const [pageTemplate] = await doc.copyPages(baseDoc, [0]);
        const page = doc.addPage(pageTemplate);

        const textColor = rgb(0, 0, 0);

        // Año de servicio y zona (arriba). Las hojas de continuación se
        // marcan para que quede claro que no repiten datos, sino que siguen
        // donde la hoja anterior se quedó sin columnas.
        const heading = `${startYear} - ${sheet.zoneName}${sheet.continuation ? ' (continuación)' : ''}`;
        page.drawText(heading, {
          x: 135,
          y: PAGE_HEIGHT - 94,
          size: 11,
          font: pickFont(heading, true),
          color: textColor,
        });

        // Dibujar cada fila
        sheet.rows.forEach((row, rowIndex) => {
          const rowY = ROW_START_Y - rowIndex * ROW_HEIGHT;

          // Centro del número y fecha
          const drawCentered = (
            text: string,
            xPos: number,
            yPos: number,
            fontSize: number,
            bold = false
          ) => {
            if (!text) return;
            const fnt = pickFont(text, bold);
            const textWidth = fnt.widthOfTextAtSize(text, fontSize);
            page.drawText(text, {
              x: xPos - textWidth / 2,
              y: yPos,
              size: fontSize,
              font: fnt,
              color: textColor,
            });
          };

          // Núm y Última fecha
          drawCentered(row.numero, COL_NUM_X, rowY - BASELINE_TOP, 9, true);
          drawCentered(row.lastCompleted, COL_DATE_X, rowY - BASELINE_TOP, 8);

          // Asignaciones
          row.assignments.forEach((assign, aIndex) => {
            const grpX = COL_GROUPS_X[aIndex];
            const nameFont = pickFont(assign.name);

            // Nombre (Top half)
            const nameWidth = nameFont.widthOfTextAtSize(assign.name, 8);
            // Centrado dentro del grupo o alineado a la izquierda si es muy largo
            let nameX = grpX + HALF_GROUP - nameWidth / 2;
            if (nameWidth > GROUP_WIDTH - 4) nameX = grpX + 2; // Si no cabe centrado, alinear a la izq

            // Truncar nombre si sigue siendo muy grande — recorta carácter a
            // carácter y vuelve a medir cada vez (antes cortaba a 20
            // caracteres fijos y añadía "..." sin comprobar si ESO cabía,
            // así que nombres con letras anchas seguían desbordando la
            // columna y nombres con letras muy estrechas se recortaban de más).
            let displayName = assign.name;
            if (nameFont.widthOfTextAtSize(displayName, 8) > GROUP_WIDTH - 2) {
              let truncated = displayName;
              while (
                truncated.length > 1 &&
                nameFont.widthOfTextAtSize(truncated + '...', 8) >
                  GROUP_WIDTH - 2
              ) {
                truncated = truncated.slice(0, -1);
              }
              displayName = truncated + '...';
            }

            page.drawText(displayName, {
              x: nameX,
              y: rowY - BASELINE_TOP,
              size: 8,
              font: nameFont,
              color: textColor,
            });

            // Fechas (Bottom half)
            drawCentered(
              assign.dateAssigned,
              grpX + HALF_GROUP / 2,
              rowY - BASELINE_BOTTOM,
              8
            );
            drawCentered(
              assign.dateCompleted,
              grpX + HALF_GROUP + HALF_GROUP / 2,
              rowY - BASELINE_BOTTOM,
              8
            );
          });
        });
      }

      // Descargar el PDF final
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, nombreArchivo('S-13', `${safeName} ${startYear}`));

      return { continuedTerritories };
    },
    [zones, territories, assignments, resolveName, safeName]
  );

  // ── Filas planas (Excel/CSV) ──
  const buildRows = useCallback(
    (filter: ExcelFilter) => {
      const openIds = new Set(
        assignments.filter((a) => !a.returnedAt).map((a) => a.territoryId)
      );

      let rows = assignments.map((a) => {
        const t = territories.find((x) => x.id === a.territoryId);
        return {
          Zona: t ? getZoneName(t.zoneId, zones) : '—',
          Territorio: t ? territoryLabel(t) : '—',
          Publicador: resolveName(a.personUid),
          Asignado: formatTerritoryDate(a.assignedAt, settings.dateFormat),
          Devuelto: a.returnedAt
            ? formatTerritoryDate(a.returnedAt, settings.dateFormat)
            : '',
          Estado: a.status,
          Campaña: a.isCampaign ? 'Sí' : 'No',
        };
      });

      if (filter === 'assigned') {
        rows = rows.filter((_, i) => !assignments[i].returnedAt);
      } else if (filter === 'unassigned') {
        // territorios sin asignación abierta → una fila por territorio libre
        return territories
          .filter((t) => !openIds.has(t.id))
          .map((t) => ({
            Zona: getZoneName(t.zoneId, zones),
            Territorio: territoryLabel(t),
            Publicador: '',
            Asignado: '',
            Devuelto: '',
            Estado: 'libre',
            Campaña: 'No',
          }));
      } else if (filter === 'campaigns') {
        rows = rows.filter((_, i) => assignments[i].isCampaign);
      }
      return rows;
    },
    [assignments, territories, zones, settings, resolveName]
  );

  const exportCsv = useCallback(
    (filter: ExcelFilter = 'all') => {
      const rows = buildRows(filter);
      const csv = Papa.unparse(rows);
      saveAs(
        new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
        `territorios_${filter}_${safeName}.csv`
      );
    },
    [buildRows, safeName]
  );

  const exportExcel = useCallback(
    async (filter: ExcelFilter = 'all') => {
      const rows = buildRows(filter);
      const headers = [
        'Zona',
        'Territorio',
        'Publicador',
        'Asignado',
        'Devuelto',
        'Estado',
        'Campaña',
      ] as const;

      const data: SheetData = [
        headers.map((h) => ({ value: h, fontWeight: 'bold' })) as Row,
        ...rows.map(
          (r) =>
            headers.map((h) => ({
              value: String(r[h] ?? ''),
              type: String,
            })) as Row
        ),
      ];

      await writeXlsxFile(data, {
        fileName: `territorios_${filter}_${safeName}.xlsx`,
        stickyRowsCount: 1,
        columns: [
          { width: 22 },
          { width: 28 },
          { width: 30 },
          { width: 16 },
          { width: 16 },
          { width: 14 },
          { width: 10 },
        ],
      });
    },
    [buildRows, safeName]
  );

  // ── Geometría (GeoJSON / KML) ──
  const exportGeoJson = useCallback(() => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: territories
        .filter((t) => t.geometry)
        .map((t) => ({
          type: 'Feature' as const,
          properties: {
            id: t.id,
            numero: t.numero,
            nombre: t.nombre ?? '',
            zona: getZoneName(t.zoneId, zones),
          },
          geometry: t.geometry,
        })),
    };
    saveAs(
      new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }),
      `territorios_${safeName}.geojson`
    );
  }, [territories, zones, safeName]);

  const exportKml = useCallback(() => {
    const items = territories
      .filter((t) => t.geometry)
      .map((t) => ({ name: territoryLabel(t), geometry: t.geometry! }));
    saveAs(
      new Blob([territoriesToKml(items)], {
        type: 'application/vnd.google-earth.kml+xml',
      }),
      `territorios_${safeName}.kml`
    );
  }, [territories, safeName]);

  return { exportS13, exportExcel, exportCsv, exportGeoJson, exportKml };
};
