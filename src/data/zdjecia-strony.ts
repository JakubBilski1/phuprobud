// Miejsca na stronie ze zdjeciem, ktore mozna podmienic w panelu /admin/ (zakladka „Zdjecia na
// stronie”). Element na stronie dostaje data-zdjecie-slot="<id>", panel pole „zdjecie:<id>”.
import manifest from './obrazy.json';
import { idMedia, PREFIKS_PLIKU } from '../lib/nadpisania';
import { infoMedia, nadpisane } from './stan';
import { realizacje, REALIZACJE } from './realizacje';

export type SlotZdjecia = { id: string; nazwa: string; plik: string; alt: string; proporcje: string };

export const slotyZdjec: SlotZdjecia[] = [
  {
    id: 'uzywane-duze',
    nazwa: 'Maszyny używane: duże zdjęcie',
    plik: 'realizacje/merlo-roto-widly',
    alt: 'Zielona ładowarka teleskopowa obrotowa Merlo z wysuniętym wysięgnikiem i widłami na placu',
    proporcje: '4 / 3',
  },
  {
    id: 'uzywane-male',
    nazwa: 'Maszyny używane: małe zdjęcie',
    plik: 'realizacje/merlo-roto-45-21-kosz',
    alt: 'Ładowarka teleskopowa obrotowa Merlo Roto 45.21 z koszem roboczym',
    proporcje: '11 / 5',
  },
];

/** Miejsce ze zdjeciem wybranym w panelu: zdjecie z galerii („plik:”) albo wgrane („media:”). */
export function slot(id: string): SlotZdjecia {
  const s = slotyZdjec.find((x) => x.id === id)!;
  const w = nadpisane(`zdjecie:${id}`);
  if (typeof w !== 'string' || !w) return s;
  if (w.startsWith(PREFIKS_PLIKU)) {
    const plik = w.slice(PREFIKS_PLIKU.length);
    if (!(plik in manifest)) return s;
    const podpis = [...realizacje, ...REALIZACJE].find((r) => r.plik === plik)?.podpis;
    return { ...s, plik, alt: podpis ?? s.alt };
  }
  return infoMedia(idMedia(w) ?? '') ? { ...s, plik: w, alt: 'Zdjęcie maszyny' } : s;
}
