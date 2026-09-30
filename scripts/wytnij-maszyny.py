# Wycina tlo ze zdjec maszyn, ktore nie maja przezroczystosci (sceneria albo biale tlo),
# zeby caly katalog stal na tych samych panelach. rembg, model isnet-general-use.
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from rembg import remove, new_session

K = Path(__file__).resolve().parent.parent
WEJ = K / 'zrodla' / 'oryginaly' / 'katalog'
WYJ = K / 'zrodla' / 'wyciecia' / 'maszyny'
DO_WYCIECIA = ['bw-120-ac-5', 'bw-65-d', 'bw-138-ad-5', 'bw-120-ad-5', 'bw-90-ad-5',
               'tl80', 'tw75', 'sv15', 'sv17', 'sv22', 'rt185', 'rt215']
sesja = new_session('isnet-general-use')
for id in DO_WYCIECIA:
    plik = next(WEJ.glob(f'{id}.*'))
    obraz = Image.open(plik).convert('RGB')
    wynik = remove(obraz, session=sesja, post_process_mask=True)
    a = np.array(wynik)
    a[..., 3] = np.where(a[..., 3] < 16, 0, a[..., 3])
    Image.fromarray(a).save(WYJ / f'{id}.png')
    print(id, obraz.size)
