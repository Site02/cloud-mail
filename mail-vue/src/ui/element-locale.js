import english from 'element-plus/es/locale/lang/en'
import {intlLanguage} from '../i18n/languages.js'

const loaders = {
  zh: () => import('element-plus/es/locale/lang/zh-cn'),
  'zh-Hant': () => import('element-plus/es/locale/lang/zh-tw'),
  es: () => import('element-plus/es/locale/lang/es'),
  fr: () => import('element-plus/es/locale/lang/fr'),
  ja: () => import('element-plus/es/locale/lang/ja'),
  ko: () => import('element-plus/es/locale/lang/ko'),
  de: () => import('element-plus/es/locale/lang/de'),
  pt: () => import('element-plus/es/locale/lang/pt-br'),
  ru: () => import('element-plus/es/locale/lang/ru'),
  it: () => import('element-plus/es/locale/lang/it'),
  id: () => import('element-plus/es/locale/lang/id'),
  vi: () => import('element-plus/es/locale/lang/vi'),
  tr: () => import('element-plus/es/locale/lang/tr'),
  ar: () => import('element-plus/es/locale/lang/ar'),
  hi: () => import('element-plus/es/locale/lang/hi'),
}

// These labels are used by controls that appear throughout the mailbox. Keep
// the rest of each component pack intact so untranslated keys remain visible
// during locale audits instead of being mistaken for reviewed translations.
const reviewedLabels = {
  es: {
    datepicker: {
      dateTablePrompt: 'Use las teclas de flecha y Entrar para seleccionar el día del mes',
      monthTablePrompt: 'Use las teclas de flecha y Entrar para seleccionar el mes',
      yearTablePrompt: 'Use las teclas de flecha y Entrar para seleccionar el año',
      selectedDate: 'Fecha seleccionada',
    },
    inputNumber: {decrease: 'Disminuir número', increase: 'Aumentar número'},
    dropdown: {toggleDropdown: 'Abrir o cerrar el menú desplegable'},
    dialog: {close: 'Cerrar este cuadro de diálogo'},
    drawer: {close: 'Cerrar este panel'},
    messagebox: {close: 'Cerrar este cuadro de diálogo', title: 'Mensaje'},
    pagination: {
      prev: 'Ir a la página anterior', next: 'Ir a la página siguiente',
      page: 'Página',
      currentPage: 'Página {pager}', prevPages: 'Retroceder {pager} páginas',
      nextPages: 'Avanzar {pager} páginas',
    },
    slider: {
      defaultLabel: 'Control deslizante entre {min} y {max}',
      defaultRangeStartLabel: 'Elegir valor inicial',
      defaultRangeEndLabel: 'Elegir valor final',
    },
    table: {
      selectAllLabel: 'Seleccionar todas las filas', selectRowLabel: 'Seleccionar esta fila',
      expandRowLabel: 'Expandir esta fila', collapseRowLabel: 'Contraer esta fila',
      sortLabel: 'Ordenar por {column}', filterLabel: 'Filtrar por {column}',
    },
  },
  fr: {
    pagination: {currentPage: 'Page {pager}'},
    table: {
      selectAllLabel: 'Sélectionner toutes les lignes', selectRowLabel: 'Sélectionner cette ligne',
      expandRowLabel: 'Développer cette ligne', collapseRowLabel: 'Réduire cette ligne',
      sortLabel: 'Trier par {column}', filterLabel: 'Filtrer par {column}',
    },
  },
  ja: {
    datepicker: {
      dateTablePrompt: '矢印キーと Enter キーで日付を選択',
      monthTablePrompt: '矢印キーと Enter キーで月を選択',
      yearTablePrompt: '矢印キーと Enter キーで年を選択',
      selectedDate: '選択した日付',
    },
    inputNumber: {decrease: '数値を減らす', increase: '数値を増やす'},
    dropdown: {toggleDropdown: 'ドロップダウンを開閉'},
    dialog: {close: 'このダイアログを閉じる'},
    drawer: {close: 'このパネルを閉じる'},
    messagebox: {close: 'このダイアログを閉じる'},
    pagination: {
      prev: '前のページに移動', next: '次のページに移動',
      page: 'ページ',
      currentPage: '{pager} ページ', prevPages: '{pager} ページ前へ',
      nextPages: '{pager} ページ先へ',
    },
    slider: {
      defaultLabel: '{min} から {max} までのスライダー',
      defaultRangeStartLabel: '開始値を選択', defaultRangeEndLabel: '終了値を選択',
    },
    table: {
      selectAllLabel: 'すべての行を選択', selectRowLabel: 'この行を選択',
      expandRowLabel: 'この行を展開', collapseRowLabel: 'この行を折りたたむ',
      sortLabel: '{column}で並べ替え', filterLabel: '{column}で絞り込む',
    },
  },
  ko: {
    datepicker: {selectedDate: '선택한 날짜'},
    table: {
      selectAllLabel: '모든 행 선택', selectRowLabel: '이 행 선택',
      expandRowLabel: '이 행 펼치기', collapseRowLabel: '이 행 접기',
      sortLabel: '{column} 기준 정렬', filterLabel: '{column} 기준 필터',
    },
  },
  de: {
    datepicker: {
      dateTablePrompt: 'Mit den Pfeiltasten und der Eingabetaste einen Tag des Monats auswählen',
      monthTablePrompt: 'Mit den Pfeiltasten und der Eingabetaste einen Monat auswählen',
      yearTablePrompt: 'Mit den Pfeiltasten und der Eingabetaste ein Jahr auswählen',
      selectedDate: 'Ausgewähltes Datum',
    },
    inputNumber: {decrease: 'Zahl verringern', increase: 'Zahl erhöhen'},
    dropdown: {toggleDropdown: 'Dropdown-Menü öffnen oder schließen'},
    dialog: {close: 'Dialog schließen'},
    drawer: {close: 'Bereich schließen'},
    messagebox: {close: 'Dialog schließen', title: 'Nachricht'},
    slider: {
      defaultLabel: 'Schieberegler zwischen {min} und {max}',
      defaultRangeStartLabel: 'Startwert auswählen', defaultRangeEndLabel: 'Endwert auswählen',
    },
    table: {
      selectAllLabel: 'Alle Zeilen auswählen', selectRowLabel: 'Diese Zeile auswählen',
      expandRowLabel: 'Diese Zeile aufklappen', collapseRowLabel: 'Diese Zeile zuklappen',
      sortLabel: 'Nach {column} sortieren', filterLabel: 'Nach {column} filtern',
    },
  },
  pt: {
    datepicker: {
      dateTablePrompt: 'Use as teclas de seta e Enter para selecionar o dia do mês',
      monthTablePrompt: 'Use as teclas de seta e Enter para selecionar o mês',
      yearTablePrompt: 'Use as teclas de seta e Enter para selecionar o ano',
      selectedDate: 'Data selecionada',
    },
    inputNumber: {decrease: 'Diminuir número', increase: 'Aumentar número'},
    dropdown: {toggleDropdown: 'Abrir ou fechar o menu suspenso'},
    dialog: {close: 'Fechar esta caixa de diálogo'},
    drawer: {close: 'Fechar este painel'},
    messagebox: {close: 'Fechar esta caixa de diálogo'},
    pagination: {
      prev: 'Ir para a página anterior', next: 'Ir para a próxima página',
      page: 'Página',
      currentPage: 'Página {pager}', prevPages: 'Voltar {pager} páginas',
      nextPages: 'Avançar {pager} páginas',
    },
    slider: {
      defaultLabel: 'Controle deslizante de {min} a {max}',
      defaultRangeStartLabel: 'Selecionar valor inicial',
      defaultRangeEndLabel: 'Selecionar valor final',
    },
    table: {
      selectAllLabel: 'Selecionar todas as linhas', selectRowLabel: 'Selecionar esta linha',
      expandRowLabel: 'Expandir esta linha', collapseRowLabel: 'Recolher esta linha',
      sortLabel: 'Ordenar por {column}', filterLabel: 'Filtrar por {column}',
    },
  },
  ru: {
    datepicker: {
      dateTablePrompt: 'Используйте клавиши со стрелками и Enter, чтобы выбрать день месяца',
      monthTablePrompt: 'Используйте клавиши со стрелками и Enter, чтобы выбрать месяц',
      yearTablePrompt: 'Используйте клавиши со стрелками и Enter, чтобы выбрать год',
      selectedDate: 'Выбранная дата',
    },
    inputNumber: {decrease: 'Уменьшить число', increase: 'Увеличить число'},
    dropdown: {toggleDropdown: 'Открыть или закрыть выпадающее меню'},
    dialog: {close: 'Закрыть диалоговое окно'},
    drawer: {close: 'Закрыть панель'},
    messagebox: {close: 'Закрыть диалоговое окно'},
    pagination: {
      prevPages: 'Назад на {pager} стр.', nextPages: 'Вперёд на {pager} стр.',
    },
    slider: {
      defaultLabel: 'Ползунок от {min} до {max}',
      defaultRangeStartLabel: 'Выбрать начальное значение',
      defaultRangeEndLabel: 'Выбрать конечное значение',
    },
    table: {
      selectAllLabel: 'Выбрать все строки', selectRowLabel: 'Выбрать эту строку',
      expandRowLabel: 'Развернуть эту строку', collapseRowLabel: 'Свернуть эту строку',
      sortLabel: 'Сортировать по {column}', filterLabel: 'Фильтровать по {column}',
    },
  },
  it: {
    datepicker: {
      dateTablePrompt: 'Usa i tasti freccia e Invio per selezionare il giorno del mese',
      monthTablePrompt: 'Usa i tasti freccia e Invio per selezionare il mese',
      yearTablePrompt: 'Usa i tasti freccia e Invio per selezionare l’anno',
      selectedDate: 'Data selezionata',
    },
    inputNumber: {decrease: 'Diminuisci il numero', increase: 'Aumenta il numero'},
    dropdown: {toggleDropdown: 'Apri o chiudi il menu a discesa'},
    dialog: {close: 'Chiudi questa finestra di dialogo'},
    drawer: {close: 'Chiudi questo pannello'},
    messagebox: {close: 'Chiudi questa finestra di dialogo', title: 'Messaggio'},
    pagination: {
      prev: 'Vai alla pagina precedente', next: 'Vai alla pagina successiva',
      page: 'Pagina',
      currentPage: 'Pagina {pager}', prevPages: 'Torna indietro di {pager} pagine',
      nextPages: 'Vai avanti di {pager} pagine',
    },
    slider: {
      defaultLabel: 'Cursore tra {min} e {max}',
      defaultRangeStartLabel: 'Scegli il valore iniziale',
      defaultRangeEndLabel: 'Scegli il valore finale',
    },
    table: {
      selectAllLabel: 'Seleziona tutte le righe', selectRowLabel: 'Seleziona questa riga',
      expandRowLabel: 'Espandi questa riga', collapseRowLabel: 'Comprimi questa riga',
      sortLabel: 'Ordina per {column}', filterLabel: 'Filtra per {column}',
      resetFilter: 'Reimposta',
    },
    image: {error: 'Caricamento non riuscito'},
  },
  id: {
    datepicker: {
      dateTablePrompt: 'Gunakan tombol panah dan Enter untuk memilih tanggal',
      monthTablePrompt: 'Gunakan tombol panah dan Enter untuk memilih bulan',
      yearTablePrompt: 'Gunakan tombol panah dan Enter untuk memilih tahun',
      selectedDate: 'Tanggal yang dipilih',
    },
    inputNumber: {decrease: 'Kurangi angka', increase: 'Tambah angka'},
    dropdown: {toggleDropdown: 'Buka atau tutup menu tarik-turun'},
    dialog: {close: 'Tutup dialog ini'},
    drawer: {close: 'Tutup panel ini'},
    messagebox: {close: 'Tutup dialog ini'},
    pagination: {
      prev: 'Buka halaman sebelumnya', next: 'Buka halaman berikutnya',
      page: 'Halaman',
      currentPage: 'Halaman {pager}', prevPages: 'Kembali {pager} halaman',
      nextPages: 'Maju {pager} halaman',
    },
    slider: {
      defaultLabel: 'Penggeser antara {min} dan {max}',
      defaultRangeStartLabel: 'Pilih nilai awal', defaultRangeEndLabel: 'Pilih nilai akhir',
    },
    table: {
      selectAllLabel: 'Pilih semua baris', selectRowLabel: 'Pilih baris ini',
      expandRowLabel: 'Luaskan baris ini', collapseRowLabel: 'Ciutkan baris ini',
      sortLabel: 'Urutkan berdasarkan {column}', filterLabel: 'Saring berdasarkan {column}',
    },
  },
  vi: {
    datepicker: {
      dateTablePrompt: 'Dùng các phím mũi tên và Enter để chọn ngày trong tháng',
      monthTablePrompt: 'Dùng các phím mũi tên và Enter để chọn tháng',
      yearTablePrompt: 'Dùng các phím mũi tên và Enter để chọn năm',
      selectedDate: 'Ngày đã chọn',
    },
    inputNumber: {decrease: 'Giảm số', increase: 'Tăng số'},
    dropdown: {toggleDropdown: 'Mở hoặc đóng menu thả xuống'},
    dialog: {close: 'Đóng hộp thoại này'},
    drawer: {close: 'Đóng bảng điều khiển này'},
    messagebox: {close: 'Đóng hộp thoại này'},
    pagination: {
      prev: 'Đến trang trước', next: 'Đến trang sau',
      page: 'Trang',
      currentPage: 'Trang {pager}', prevPages: 'Lùi {pager} trang',
      nextPages: 'Tiến {pager} trang',
    },
    slider: {
      defaultLabel: 'Thanh trượt từ {min} đến {max}',
      defaultRangeStartLabel: 'Chọn giá trị bắt đầu',
      defaultRangeEndLabel: 'Chọn giá trị kết thúc',
    },
    table: {
      selectAllLabel: 'Chọn tất cả hàng', selectRowLabel: 'Chọn hàng này',
      expandRowLabel: 'Mở rộng hàng này', collapseRowLabel: 'Thu gọn hàng này',
      sortLabel: 'Sắp xếp theo {column}', filterLabel: 'Lọc theo {column}',
    },
  },
  tr: {
    datepicker: {
      dateTablePrompt: 'Ayın gününü seçmek için ok tuşlarını ve Enter tuşunu kullanın',
      monthTablePrompt: 'Ayı seçmek için ok tuşlarını ve Enter tuşunu kullanın',
      yearTablePrompt: 'Yılı seçmek için ok tuşlarını ve Enter tuşunu kullanın',
      selectedDate: 'Seçilen tarih',
    },
    inputNumber: {decrease: 'Sayıyı azalt', increase: 'Sayıyı artır'},
    dropdown: {toggleDropdown: 'Açılır menüyü aç veya kapat'},
    dialog: {close: 'Bu iletişim kutusunu kapat'},
    drawer: {close: 'Bu paneli kapat'},
    messagebox: {close: 'Bu iletişim kutusunu kapat'},
    pagination: {
      prev: 'Önceki sayfaya git', next: 'Sonraki sayfaya git',
      page: 'Sayfa',
      currentPage: 'Sayfa {pager}', prevPages: '{pager} sayfa geri git',
      nextPages: '{pager} sayfa ileri git',
    },
    slider: {
      defaultLabel: '{min} ile {max} arasında kaydırıcı',
      defaultRangeStartLabel: 'Başlangıç değerini seç',
      defaultRangeEndLabel: 'Bitiş değerini seç',
    },
    table: {
      selectAllLabel: 'Tüm satırları seç', selectRowLabel: 'Bu satırı seç',
      expandRowLabel: 'Bu satırı genişlet', collapseRowLabel: 'Bu satırı daralt',
      sortLabel: '{column} sütununa göre sırala', filterLabel: '{column} sütununa göre filtrele',
    },
  },
  ar: {
    datepicker: {selectedDate: 'التاريخ المحدد'},
    dialog: {close: 'إغلاق مربع الحوار'},
    drawer: {close: 'إغلاق اللوحة'},
    messagebox: {close: 'إغلاق مربع الحوار'},
    pagination: {
      prev: 'الانتقال إلى الصفحة السابقة', next: 'الانتقال إلى الصفحة التالية',
      page: 'صفحة',
      currentPage: 'الصفحة {pager}', prevPages: 'الرجوع بمقدار {pager} صفحة',
      nextPages: 'التقدم بمقدار {pager} صفحة',
    },
    slider: {
      defaultLabel: 'شريط تمرير من {min} إلى {max}',
      defaultRangeStartLabel: 'اختيار قيمة البداية',
      defaultRangeEndLabel: 'اختيار قيمة النهاية',
    },
    table: {
      selectAllLabel: 'تحديد كل الصفوف', selectRowLabel: 'تحديد هذا الصف',
      expandRowLabel: 'توسيع هذا الصف', collapseRowLabel: 'طي هذا الصف',
      sortLabel: 'الترتيب حسب {column}', filterLabel: 'التصفية حسب {column}',
    },
  },
  hi: {
    table: {
      selectAllLabel: 'सभी पंक्तियाँ चुनें', selectRowLabel: 'यह पंक्ति चुनें',
      expandRowLabel: 'यह पंक्ति फैलाएँ', collapseRowLabel: 'यह पंक्ति समेटें',
      sortLabel: '{column} के अनुसार क्रमबद्ध करें',
      filterLabel: '{column} के अनुसार फ़िल्टर करें',
    },
  },
  'zh-Hant': {
    table: {
      selectAllLabel: '選取所有列', selectRowLabel: '選取此列',
      expandRowLabel: '展開此列', collapseRowLabel: '收合此列',
      sortLabel: '依 {column} 排序', filterLabel: '依 {column} 篩選',
    },
  },
}

function withReviewedLabels(code, locale) {
  const reviewed = reviewedLabels[code]
  if (!reviewed) return locale
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const weekdayFormatter = new Intl.DateTimeFormat(intlLanguage(code), {
    weekday: 'long', timeZone: 'UTC',
  })
  const weeksFull = Object.fromEntries(weekdays.map((day, index) => [
    day,
    weekdayFormatter.format(new Date(Date.UTC(2023, 0, 1 + index))),
  ]))
  return {
    ...locale,
    el: {
      ...locale.el,
      ...Object.fromEntries(Object.entries(reviewed).map(([component, labels]) => [
        component,
        {...locale.el[component], ...labels},
      ])),
      datepicker: {...locale.el.datepicker, ...reviewed.datepicker, weeksFull},
    },
  }
}

const cache = new Map([['en', Promise.resolve(english)]])

export function hasElementLocale(code) {
  return code === 'en' || Boolean(loaders[code])
}

export function loadElementLocale(code) {
  if (cache.has(code)) return cache.get(code)
  if (!loaders[code]) return Promise.reject(new Error(`Component locale ${code} is unavailable`))
  const result = loaders[code]().then(module => withReviewedLabels(code, module.default)).catch(error => {
    cache.delete(code)
    throw error
  })
  cache.set(code, result)
  return result
}
