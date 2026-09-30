// Drobna typografia polska: jednoliterowe spojniki i przyimki nie zostaja na koncu
// wiersza, liczba nie odrywa sie od jednostki.
const NBSP = ' ';

export function sierotki(tekst: string): string {
  return tekst
    .replace(/(^|[\s(„])([aiouwzAIOUWZ])\s+/g, `$1$2${NBSP}`)
    .replace(/(\d)\s+(kg|t|mm|cm|m|kN|kW|Hz|km\/h|m\/min|zł|%)(?=[\s.,;:)]|$)/g, `$1${NBSP}$2`);
}

const liczby = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

/** 2700 -> "2700", 12500 -> "12 500", 3.6 -> "3,6" (polski zapis). */
export function liczba(n: number): string {
  return liczby.format(n);
}

/** "+48 601 896 689" -> "tel:+48601896689" */
export function telHref(numer: string): string {
  return `tel:${numer.replace(/[^\d+]/g, '')}`;
}

/** "+48 601 896 689" -> "601 896 689" (do wyswietlenia; kierunkowy zostaje w linku). */
export function telKrotki(numer: string): string {
  return numer.replace(/^\+48\s*/, '');
}

/** Polska odmiana po liczebniku: odmiana(5, ['model', 'modele', 'modeli']) -> "5 modeli". */
export function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
  const d = n % 10, s = n % 100;
  const slowo = n === 1 ? jeden : d >= 2 && d <= 4 && (s < 12 || s > 14) ? kilka : wiele;
  return `${n} ${slowo}`;
}
