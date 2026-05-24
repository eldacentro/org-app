import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import appDb from '@db/appDb';

export const googleDriveIsConnected = (
  backupAutomatic: {
    google_drive_access_token?: { value: string; updatedAt: string };
    google_drive_token_expiry?: { value: string; updatedAt: string };
  } | undefined
): boolean => {
  if (!backupAutomatic) return false;
  const token = backupAutomatic.google_drive_access_token?.value;
  const expiry = backupAutomatic.google_drive_token_expiry?.value;
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
};

export const googleDriveConnect = async (): Promise<boolean> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    const auth = getAuth();
    // Opens standard Google sign-in popup to grant Drive scopes
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    const email = result.user?.email || '';

    if (accessToken) {
      const expiry = Date.now() + 3600 * 1000;
      await dbAppSettingsUpdate({
        'user_settings.backup_automatic.google_drive_access_token': {
          value: accessToken,
          updatedAt: new Date().toISOString(),
        },
        'user_settings.backup_automatic.google_drive_token_expiry': {
          value: expiry.toString(),
          updatedAt: new Date().toISOString(),
        },
        'user_settings.backup_automatic.google_drive_email': {
          value: email,
          updatedAt: new Date().toISOString(),
        },
        'user_settings.backup_automatic.google_drive_auto_enabled': {
          value: true,
          updatedAt: new Date().toISOString(),
        },
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error connecting to Google Drive:', error);
    return false;
  }
};

export const googleDriveDisconnect = async (): Promise<void> => {
  await dbAppSettingsUpdate({
    'user_settings.backup_automatic.google_drive_access_token': {
      value: '',
      updatedAt: new Date().toISOString(),
    },
    'user_settings.backup_automatic.google_drive_token_expiry': {
      value: '',
      updatedAt: new Date().toISOString(),
    },
    'user_settings.backup_automatic.google_drive_email': {
      value: '',
      updatedAt: new Date().toISOString(),
    },
    'user_settings.backup_automatic.google_drive_auto_enabled': {
      value: false,
      updatedAt: new Date().toISOString(),
    },
  });
};

const getOrCreateFolder = async (accessToken: string): Promise<string | null> => {
  const folderName = 'Elda Centro App Backups';
  
  // 1. Search for existing folder
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;
  
  try {
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      throw new Error(`Folder search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Create folder if not found
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Folder creation failed: ${createRes.statusText}`);
    }

    const createData = await createRes.json();
    return createData.id || null;
  } catch (error) {
    console.error('Error in getOrCreateFolder:', error);
    return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const googleDriveUploadBackup = async (backupData: any): Promise<boolean> => {
  const settings = await appDb.app_settings.get(1);
  if (!settings) return false;

  const backupAutomatic = settings.user_settings.backup_automatic;
  const isAutoEnabled = backupAutomatic.google_drive_auto_enabled?.value === true;
  if (!isAutoEnabled) return false;

  const token = backupAutomatic.google_drive_access_token?.value;
  const expiry = backupAutomatic.google_drive_token_expiry?.value;

  if (!token || !expiry || Date.now() >= parseInt(expiry, 10)) {
    console.warn('Google Drive token expired or not connected. Skipping upload.');
    return false;
  }

  try {
    const folderId = await getOrCreateFolder(token);
    if (!folderId) {
      throw new Error('Failed to retrieve or create destination folder.');
    }

    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `Elda_Centro_Backup_${dateString}.json`;

    // Check if a backup file with the same name already exists in that folder to avoid duplicates on the same day
    const query = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    let fileId: string | null = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }
    }

    const fileContent = JSON.stringify(backupData);
    const boundary = 'elda_centro_backup_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: any = {
      name: fileName,
      mimeType: 'application/json',
    };

    if (fileId) {
      // Overwrite/update if it exists for the same day
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      // Create new file inside parent folder
      metadata.parents = [folderId];
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const uploadRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error uploading backup to Google Drive:', error);
    return false;
  }
};
