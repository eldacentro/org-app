import { Box, Stack } from '@mui/material';
import { IconImportFile } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useImportTalks from './useImportTalks';
import NavBarButton from '@components/nav_bar_button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';

const TYPE_COLOR: Record<string, string> = {
  added: 'var(--accent-main)',
  renamed: 'var(--grey-400)',
  reactivated: 'var(--accent-main)',
  retired: 'var(--red-main)',
};

const TYPE_LABEL_KEY: Record<string, string> = {
  added: 'tr_jwpubImportAdded',
  renamed: 'tr_jwpubImportRenamed',
  reactivated: 'tr_jwpubImportReactivated',
  retired: 'tr_jwpubImportRetired',
};

const ImportTalks = () => {
  const { t } = useAppTranslation();

  const {
    fileInputRef,
    handleOpenFilePicker,
    handleFileSelected,
    isParsing,
    isSaving,
    diffs,
    handleCancel,
    handleConfirm,
  } = useImportTalks();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jwpub"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

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

      {diffs && (
        <Dialog onClose={handleCancel} open={Boolean(diffs)} sx={{ maxWidth: '100%' }}>
          <Typography className="h2">{t('tr_jwpubImportTitle')}</Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            {t('tr_jwpubImportDesc')}
          </Typography>

          <Stack
            spacing="8px"
            sx={{
              width: '100%',
              maxHeight: '360px',
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {diffs.map((diff) => (
              <Box
                key={diff.talk_number}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-l)',
                  border: '1px solid var(--accent-200)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography className="body-small-semibold">
                    {diff.talk_number}
                  </Typography>
                  <Typography
                    className="label-small-semibold"
                    sx={{ color: TYPE_COLOR[diff.type] }}
                  >
                    {t(TYPE_LABEL_KEY[diff.type])}
                  </Typography>
                </Box>

                {diff.previous_title.length > 0 && (
                  <Typography
                    className="body-small-regular"
                    color="var(--grey-350)"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    {diff.previous_title}
                  </Typography>
                )}

                <Typography className="body-small-regular">
                  {diff.new_title}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
            }}
          >
            <Button
              variant="main"
              onClick={handleConfirm}
              disabled={isSaving}
              startIcon={isSaving ? <IconLoading color="card" /> : null}
            >
              {t('tr_continue')}
            </Button>
            <Button variant="tertiary" onClick={handleCancel} disabled={isSaving}>
              {t('tr_cancel')}
            </Button>
          </Box>
        </Dialog>
      )}
    </>
  );
};

export default ImportTalks;
