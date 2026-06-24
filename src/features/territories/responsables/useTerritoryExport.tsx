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
import { PDFDocument, rgb } from 'pdf-lib';

const S13_DATE = 'dd-MM-yyyy';
const ROWS_PER_SHEET = 20;

// Coordenadas y layout para la plantilla original
const PAGE_HEIGHT = 842.04;
const ROW_START_Y = 697.5; // Borde superior de la fila 1 (desde abajo)
const ROW_HEIGHT = 31.7; // Alto de cada fila
// Baselines
const BASELINE_TOP = 11; // Desde el borde superior de la fila hasta el texto del nombre/num
const BASELINE_BOTTOM = 26; // Desde el borde superior de la fila hasta el texto de fechas

const COL_NUM_X = 55; // Centro de Núm. de terr.
const COL_DATE_X = 105; // Centro de Última fecha
const COL_GROUPS_X = [135, 241.6, 348.2, 454.8]; // Borde izquierdo de cada grupo
const GROUP_WIDTH = 106.6;
const HALF_GROUP = GROUP_WIDTH / 2;

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
      const sheetsData: { zoneName: string; rows: { numero: string; lastCompleted: string; assignments: { name: string; dateAssigned: string; dateCompleted: string; }[] }[] }[] = [];

      zones.forEach((zone) => {
        const zoneTerritories = territories
          .filter((t) => t.zoneId === zone.id)
          .sort((a, b) =>
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
          );
        if (zoneTerritories.length === 0) return;

        const rows = zoneTerritories.map((t) => ({
          numero: t.numero,
          lastCompleted: t.lastWorkedAt
            ? formatTerritoryDate(t.lastWorkedAt, S13_DATE)
            : '',
          assignments: assignments
            .filter((a) => a.territoryId === t.id)
            .filter((a) => includeCampaigns || !a.isCampaign)
            .filter(inServiceYear)
            .sort(
              (x, y) =>
                new Date(x.assignedAt).getTime() -
                new Date(y.assignedAt).getTime()
            )
            .slice(0, 4) // ← IMPORTANTE: La plantilla física solo tiene 4 columnas
            .map((a) => ({
              name: resolveName(a.personUid) + (a.isCampaign ? ' (C)' : ''),
              dateAssigned: formatTerritoryDate(a.assignedAt, S13_DATE),
              dateCompleted: a.returnedAt
                ? formatTerritoryDate(a.returnedAt, S13_DATE)
                : '',
            })),
        }));

        for (let i = 0; i < rows.length; i += ROWS_PER_SHEET) {
          sheetsData.push({
            zoneName: zone.nombre,
            rows: rows.slice(i, i + ROWS_PER_SHEET),
          });
        }
      });

      if (sheetsData.length === 0) return;

      // Cargar plantilla base
      const templateRes = await fetch('/pdf/S-13_S.pdf');
      const templateBytes = await templateRes.arrayBuffer();
      
      const doc = await PDFDocument.create();
      const baseDoc = await PDFDocument.load(templateBytes);
      
      const font = await doc.embedFont('Helvetica');
      const fontBold = await doc.embedFont('Helvetica-Bold');

      for (const sheet of sheetsData) {
        // Por cada "sheet", creamos una página nueva clonando la base
        const [pageTemplate] = await doc.copyPages(baseDoc, [0]);
        const page = doc.addPage(pageTemplate);

        const textColor = rgb(0, 0, 0);

        // Año de servicio y zona (arriba)
        page.drawText(`${startYear} - ${sheet.zoneName}`, {
          x: 135,
          y: PAGE_HEIGHT - 94,
          size: 11,
          font: fontBold,
          color: textColor,
        });

        // Dibujar cada fila
        sheet.rows.forEach((row, rowIndex) => {
          const rowY = ROW_START_Y - rowIndex * ROW_HEIGHT;
          
          // Centro del número y fecha
          const drawCentered = (text: string, xPos: number, yPos: number, fontSize: number, fnt = font) => {
            if (!text) return;
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
          drawCentered(row.numero, COL_NUM_X, rowY - BASELINE_TOP, 9, fontBold);
          drawCentered(row.lastCompleted, COL_DATE_X, rowY - BASELINE_TOP, 8);

          // Asignaciones
          row.assignments.forEach((assign, aIndex) => {
            const grpX = COL_GROUPS_X[aIndex];
            
            // Nombre (Top half)
            const nameWidth = font.widthOfTextAtSize(assign.name, 8);
            // Centrado dentro del grupo o alineado a la izquierda si es muy largo
            let nameX = grpX + HALF_GROUP - nameWidth / 2;
            if (nameWidth > GROUP_WIDTH - 4) nameX = grpX + 2; // Si no cabe centrado, alinear a la izq
            
            // Truncar nombre si sigue siendo muy grande
            let displayName = assign.name;
            if (font.widthOfTextAtSize(displayName, 8) > GROUP_WIDTH - 2) {
               displayName = displayName.substring(0, 20) + '...';
            }

            page.drawText(displayName, {
              x: nameX,
              y: rowY - BASELINE_TOP,
              size: 8,
              font,
              color: textColor,
            });

            // Fechas (Bottom half)
            drawCentered(assign.dateAssigned, grpX + HALF_GROUP / 2, rowY - BASELINE_BOTTOM, 8);
            drawCentered(assign.dateCompleted, grpX + HALF_GROUP + HALF_GROUP / 2, rowY - BASELINE_BOTTOM, 8);
          });
        });
      }

      // Descargar el PDF final
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `S-13_${safeName}_${startYear}.pdf`);
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
            headers.map((h) => ({ value: String(r[h] ?? ''), type: String })) as Row
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
