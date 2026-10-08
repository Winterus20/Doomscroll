/**
 * İnce yeniden-ihraç shimi: asıl sözleşme spec'i `tests/lab-rebalance.spec.ts`
 * konumunda durur; vitest include kalıbı yalnız src içindeki testleri
 * topladığı için bu dosya paketi `npm test` kapsamına sokar.
 * paketi `npm test` kapsamına sokar. Testlerin tek kaynağı spec dosyasıdır.
 */
import '../../tests/lab-rebalance.spec'
