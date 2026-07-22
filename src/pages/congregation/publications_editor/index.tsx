import { Navigate } from 'react-router';
import { useCurrentUser } from '@hooks/index';
import JwpubStudio from '@features/jwpub_studio';

// Solo para admin/coordinador o usuarios con el rol publications_editor
// activado por un admin en "Derechos adicionales". El resto se redirige.
const PublicationsEditorPage = () => {
  const { isPublicationsEditor } = useCurrentUser();

  if (!isPublicationsEditor) return <Navigate to="/" replace />;

  return <JwpubStudio />;
};

export default PublicationsEditorPage;
