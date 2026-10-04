// Miejsca na stronie ze zdjeciem, ktore mozna podmienic w panelu /admin/ (zakladka „Zdjecia na
// stronie”). Element na stronie dostaje data-zdjecie-slot="<id>", panel pole „zdjecie:<id>”.
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

export const slot = (id: string) => slotyZdjec.find((s) => s.id === id)!;
