// Galeria „Realizacje”: najpierw zdjecia od Probudu (pazdziernik 2026), potem siedem
// zachowanych ze starej strony. Podpis z marka i modelem tylko tam, gdzie widac je na maszynie.
import manifest from './obrazy.json';
import { idMedia, type PozycjaGalerii } from '../lib/nadpisania';
import { infoMedia, nadpisane, poZmianie } from './stan';

/** plik = klucz zdjecia w manifescie albo „media:<id>” (zdjecie wgrane w panelu). */
export type Realizacja = { plik: string; podpis: string };

/** Galeria z repozytorium: oryginal w panelu i zrodlo zdjec do wyboru w „Zdjeciach na stronie”. */
export const REALIZACJE: Realizacja[] = [
  { plik: 'realizacje/merlo-roto-widly', podpis: 'Ładowarka teleskopowa obrotowa Merlo' },
  { plik: 'realizacje/case-koparko-ladowarka-1', podpis: 'Koparko-ładowarka Case' },
  { plik: 'realizacje/jcb-8025-zts', podpis: 'Minikoparka JCB 8025 ZTS' },
  { plik: 'realizacje/case-821g', podpis: 'Ładowarka kołowa Case 821G' },
  { plik: 'realizacje/atlas-150w', podpis: 'Koparka kołowa Atlas 150W' },
  { plik: 'realizacje/bomag-bw-120-ad', podpis: 'Walec tandemowy BOMAG BW 120 AD' },
  { plik: 'realizacje/merlo-roto-45-21-kosz', podpis: 'Ładowarka teleskopowa obrotowa Merlo Roto 45.21 z koszem' },
  { plik: 'realizacje/liugong', podpis: 'Ładowarka kołowa LiuGong' },
  { plik: 'realizacje/case-koparko-ladowarka-2', podpis: 'Koparko-ładowarka Case' },
  { plik: 'realizacje/bomag-bmp-8500', podpis: 'Walec okołkowany BOMAG BMP 8500' },
  { plik: 'realizacje/merlo-roto-bok', podpis: 'Ładowarka teleskopowa obrotowa' },
  { plik: 'realizacje/ladowarka-v80', podpis: 'Ładowarka kołowa z widłami' },
  { plik: 'realizacje/02', podpis: 'Koparko-ładowarka Komatsu' },
  { plik: 'realizacje/08', podpis: 'Ładowarka teleskopowa obrotowa' },
  { plik: 'realizacje/09', podpis: 'Ładowarka teleskopowa Merlo' },
  { plik: 'realizacje/13', podpis: 'Koparko-ładowarka Case' },
  { plik: 'realizacje/14', podpis: 'Koparko-ładowarka' },
  { plik: 'realizacje/16', podpis: 'Minikoparka' },
  { plik: 'realizacje/17', podpis: 'Koparka kołowa Atlas' },
];

const znane = (plik: string) => plik in manifest || Boolean(infoMedia(idMedia(plik) ?? ''));

/** Galeria na strone: kolejnosc, podpisy i zdjecia z panelu; bez zapisu w panelu oryginal. */
export let realizacje: Realizacja[] = REALIZACJE;

poZmianie(() => {
  realizacje = REALIZACJE;
  const zapis = nadpisane('galeria:uklad');
  if (typeof zapis !== 'string') return;
  try {
    const uklad = (JSON.parse(zapis) as PozycjaGalerii[])
      .filter((p) => znane(p.z))
      .map((p) => ({ plik: p.z, podpis: p.p.trim() || 'Zdjęcie realizacji' }));
    if (uklad.length) realizacje = uklad;
  } catch {
    // uszkodzony zapis: zostaje oryginal
  }
});
