# Wycina tlo z portretow (rembg, u2net_human_seg) i usuwa jasna obwodke:
# pikselom polprzezroczystym podmienia kolor na kolor sasiednich pikseli nieprzezroczystych
# (cv2.inpaint), bo inaczej tlo zdjecia zostaje jako rant na kolorowym panelu.
# Uruchamiane lokalnie; wynik w zrodla/wyciecia/, dalej przez scripts/obrazy.mjs.
import json, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session

KORZEN = Path(__file__).resolve().parent.parent
WEJ = KORZEN / 'zrodla' / 'oryginaly' / 'ludzie'
WYJ = KORZEN / 'zrodla' / 'wyciecia'
sesja = new_session('u2net_human_seg')
# Szerokosc twarzy (od policzka do policzka) zmierzona recznie na oryginalach, w px.
TWARZE = {'krzysztof-bilski': (470, 1140), 'szymon-atraszkiewicz': (707, 917),
          'marcin-maj': (430, 1190), 'tomasz-jurga': (440, 1200)}
wynik = {}
for plik in sorted(WEJ.glob('*.jpg')):
    obraz = Image.open(plik).convert('RGB')
    rgba = np.array(remove(obraz, session=sesja, post_process_mask=True))
    rgb, alfa = rgba[..., :3].copy(), rgba[..., 3]
    alfa = np.where(alfa < 12, 0, alfa).astype(np.uint8)
    niepelne = ((alfa < 250)).astype(np.uint8) * 255
    rgb = cv2.inpaint(rgb, niepelne, 6, cv2.INPAINT_TELEA)
    ys, xs = np.where(alfa > 0)
    wynik[plik.stem] = {'szer': obraz.width, 'wys': obraz.height, 'twarz_x': list(TWARZE[plik.stem]),
                        'postac': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    Image.fromarray(np.dstack([rgb, alfa])).save(WYJ / f'{plik.stem}.png')
    print(plik.stem, wynik[plik.stem])
(WYJ / 'pomiary.json').write_text(json.dumps(wynik, indent=1))
