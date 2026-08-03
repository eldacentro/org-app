import useSongsImport from './useSongsImport';
import JwpubReportDialog from '@features/meeting_materials/jwpub_report';
import ImportRow from '@features/meeting_materials/import_row';

/**
 * Importar el cancionero desde un `.jwpub`.
 *
 * El hallazgo que da sentido a esto: los cánticos NO se actualizan solos. No
 * llegan por la API ni por la sincronización — salen de
 * `src/locales/{idioma}/songs.json`, que viaja dentro de la aplicación y solo
 * cambia cuando se publica una versión nueva. Si eso deja de mantenerse aguas
 * arriba, la congregación se queda con el cancionero que tenga. Esto no es un
 * plan B: es la única vía que habría.
 */
const SongsImport = () => {
  const {
    fileInputRef,
    handleOpenFilePicker,
    handleFileSelected,
    isParsing,
    isSaving,
    report,
    pendingImport,
    handleCancel,
    handleConfirm,
  } = useSongsImport();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        // Sin `accept`: iOS agrisa los .jwpub si se restringe por extensión
        // (no es un UTI reconocido). Se valida al leerlo.
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <ImportRow
        titulo="Importar el cancionero desde archivo .jwpub"
        descripcion="Los cánticos no llegan por la sincronización: vienen dentro de la aplicación. Esta es la única forma de ponerlos al día sin esperar a una versión nueva."
        isBusy={isParsing}
        onClick={handleOpenFilePicker}
      />

      {report && pendingImport && (
        <JwpubReportDialog
          open={Boolean(report)}
          report={report}
          entidadSingular="cántico"
          entidadPlural="cánticos"
          publicationTitle={pendingImport.publicationTitle}
          aviso={pendingImport.aviso}
          isSaving={isSaving}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};

export default SongsImport;
