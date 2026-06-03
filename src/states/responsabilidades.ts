import { atom } from 'jotai';
import { ResponsabilidadesType } from '@definition/responsabilidades';

export const responsabilidadesState = atom<ResponsabilidadesType | null>(null);
