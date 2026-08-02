import { useAppTranslation } from '@hooks/index';
import { IconImportFile } from '@components/icons';
import useImportTalks from './useImportTalks';
import NavBarButton from '@components/nav_bar_button';
import IconLoading from '@components/icon_loading';
import JwpubReportDialog from '@features/meeting_materials/jwpub_report';
import ImportRow from '@features/meeting_materials/import_row';
import { ImportTalksVariantType } from './index.types';

/**
 * Importar los bosquejos de discursos públicos desde un `.jwpub`.
 *
 * Se llama desde dos sitios —la barra de Discursos públicos y la tarjeta de
 * Materiales de reunión— y la lógica es UNA: lo único que cambia es el
 * disparador que se pinta.
 */
const ImportTalks = ({
  variant = 'navbar',
}: {
  variant?: ImportTalksVariantType;
}) => {
  const { t } = useAppTranslation();

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
  } = useImportTalks();

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

      {variant === 'navbar' ? (
        <NavBarButton
          text={t('tr_jwpubImport')}
          icon={
            isParsing ? (
              <IconLoading color="accent" />
            ) : (
              <IconImportFile height={22} width={22} />
            )
          }
          onClick={handleOpenFilePicker}
          disabled={isParsing}
        />
      ) : (
        <ImportRow
          titulo="Importar bosquejos desde archivo .jwpub"
          descripcion="El archivo S-34 de los bosquejos de discursos públicos. Sustituye los títulos que traiga; los que no traiga se quedan como están."
          isBusy={isParsing}
          onClick={handleOpenFilePicker}
        />
      )}

      {report && pendingImport && (
        <JwpubReportDialog
          open={Boolean(report)}
          report={report}
          entidadSingular="bosquejo"
          entidadPlural="bosquejos"
          publicationTitle={pendingImport.publicationTitle}
          isSaving={isSaving}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};

export default ImportTalks;
