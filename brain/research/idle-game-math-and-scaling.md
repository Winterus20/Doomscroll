# Araştırma Raporu: Büyüme Modelleri, Formüller ve Dilation Matematiği

## 1. Büyüme Sınıfları

### Dereceli Polinomik Büyüme (Tiered Production)
$k$ adet boyuttan oluşan bir üretim zincirinde, $n$. boyut $n-1$. boyutu üretirken, toplam ana kaynak üretimi zamanın $k$. kuvveti ile ölçeklenir:
$$\text{Production}(t) \propto t^k$$
8 boyutlu bir sistemde serbest büyüme $O(t^8)$ gibi son derece tatmin edici bir ivmeye sahiptir.

### Üstel Çarpanlar (Exponential Multipliers)
Her 10 adet satın almada boyut çarpanı $2\times$ katlanır:
$$\text{Multiplier} = 2^{\lfloor \text{bought} / 10 \rfloor}$$

### Dilation ve Softcap Matematiği
Sayıların kontrolsüz patlamasını önlemek ve oyuncuya aşması gereken bir direnç sunmak için sert tavanlar (hardcap) yerine "Zaman Genleşmesi / Dilation" uygulanır:
$$\text{Dilated Amount} = 10^{(\log_{10}(\text{Amount})^\alpha)} \quad (0 < \alpha < 1)$$
$\alpha = 0.75$ durumunda $10^{1000}$ büyüklüğündeki bir kaynak $10^{177}$ seviyesine indirgenir.
