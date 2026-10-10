/**
 * Haber veritabani birlestiricisi: donem dosyalari burada orijinal sirayla
 * birlesir; disariya acik NEWS_DATABASE ve yardimci tipler degismez.
 */
import { EARLY_NEWS } from "./news-early"
import { CODE_NEWS, SCI_NEWS } from "./news-mid"
import {
  DYN_NEWS,
  SECRET_NEWS,
  DARK_NEWS,
  COSMIC_NEWS,
  POP_NEWS,
  SECRET_FINALE_NEWS
} from "./news-late"
import type { NewsItem } from "./news-early"
export type { NewsClickResult, NewsStoreView, NewsItem } from "./news-early"
export { resetNewsState } from "./news-early"

export const NEWS_DATABASE: NewsItem[] = [
  ...EARLY_NEWS,
  ...CODE_NEWS,
  ...DYN_NEWS,
  ...SECRET_NEWS,
  ...DARK_NEWS,
  ...SCI_NEWS,
  ...COSMIC_NEWS,
  ...POP_NEWS,
  ...SECRET_FINALE_NEWS
]
