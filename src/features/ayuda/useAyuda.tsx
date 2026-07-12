import { useMemo, useState } from 'react';
import { useCurrentUser } from '@hooks/index';
import { AyudaRoles, AyudaSection } from '@definition/ayuda';
import { AYUDA_SECTIONS } from './content';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const useAyuda = () => {
  const user = useCurrentUser();

  const [search, setSearch] = useState('');

  const roles: AyudaRoles = useMemo(
    () => ({
      isAdmin: user.isAdmin,
      isElder: user.isElder,
      isSecretary: user.isSecretary,
      isPublicTalkCoordinator: user.isPublicTalkCoordinator,
      isMidweekEditor: user.isMidweekEditor,
      isWeekendEditor: user.isWeekendEditor,
      isDepartmentsEditor: user.isDepartmentsEditor,
      isAttendanceEditor: user.isAttendanceEditor,
      isGroupOverseer: user.isGroupOverseer,
      isServiceCommittee: user.isServiceCommittee,
      isPersonViewer: user.isPersonViewer,
      isSettingsEditor: user.isSettingsEditor,
    }),
    [user]
  );

  const sections = useMemo(() => {
    // visibles por rol; las "en preparación" solo para el admin (para validar
    // la estructura sin prometer contenido que aún no existe)
    const visible = AYUDA_SECTIONS.filter((section) => {
      if (!section.visible(roles)) return false;
      if (section.comingSoon && !roles.isAdmin) return false;
      return true;
    });

    const term = normalize(search.trim());
    if (term.length < 2) return visible;

    // búsqueda: filtra artículos cuyo título o contenido contenga el término
    const result: AyudaSection[] = [];

    for (const section of visible) {
      const articles = section.articles.filter((article) => {
        const haystack = [
          article.title,
          ...article.blocks.map((b) => {
            if (b.type === 'faq') return `${b.q} ${b.a}`;
            if (b.type === 'steps') return `${b.title ?? ''} ${b.items.join(' ')}`;
            return b.text;
          }),
        ]
          .map(normalize)
          .join(' ');

        return haystack.includes(term);
      });

      if (articles.length > 0) {
        result.push({ ...section, articles });
      }
    }

    return result;
  }, [roles, search]);

  const isSearching = normalize(search.trim()).length >= 2;

  return { sections, search, setSearch, isSearching };
};

export default useAyuda;
