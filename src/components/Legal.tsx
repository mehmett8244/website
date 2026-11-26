
import Link from "next/link";

const DOCS: Record<string, { t: string; intro: string; s: [string, string][] }> = {
  gizlilik: {
    t: "Gizlilik Politikası",
    intro:
      "Son Kural Bükücü olarak kullanıcılarımızın gizliliğine ve kişisel verilerinin korunmasına önem veriyoruz. Bu politika, platformumuzu kullanırken hangi bilgilerin işlendiğini ve bunların nasıl korunduğunu açıklar.",
    s: [
      [
        "1. Toplanan Bilgiler",
        "Hesap oluşturma sırasında e-posta adresi ve kullanıcı adı gibi bilgiler işlenir. Profil fotoğrafı, biyografi, gönderiler, hikâyeler, yorumlar, beğeniler, özel mesajlar ve yüklenen medya dosyaları da platform özelliklerinin sunulması kapsamında işlenebilir."
      ],
      [
        "2. Kullanım Bilgileri",
        "Platformun kullanımı sırasında hesap etkinlikleri, son görülme bilgisi, oturum ve işlem güvenliği kayıtları gibi teknik bilgiler işlenebilir."
      ],
      [
        "3. Verilerin Kullanım Amaçları",
        "Bilgiler; hesap oluşturma ve yönetme, kullanıcılar arasında iletişim sağlama, içerikleri görüntüleme, bildirim gönderme, güvenliği sağlama, kötüye kullanımı önleme ve platformu geliştirme amaçlarıyla kullanılır."
      ],
      [
        "4. Mesajlar ve Paylaşılan İçerikler",
        "Özel mesajlar yalnızca ilgili iletişim özelliğinin çalışması amacıyla işlenir. Gönderiler ve hikâyeler, hesabın gizlilik ayarlarına ve platformun çalışma biçimine göre diğer kullanıcılar tarafından görüntülenebilir. Özel mesajlaşma, uçtan uca şifreleme olduğu anlamına gelmez."
      ],
      [
        "5. Çerezler ve Teknik Veriler",
        "Oturum yönetimi, güvenlik ve platformun düzgün çalışması için gerekli teknik veriler ve çerezler kullanılabilir."
      ],
      [
        "6. Üçüncü Taraf Hizmetler",
        "Platformun altyapısında Supabase ve Vercel hizmetlerinden yararlanılır. Kullanıcı verileri, hizmetlerin sunulması kapsamında bu sağlayıcılar tarafından işlenebilir. Verilerin saklandığı bölgeler ve olası yurt dışı aktarımları kullanılan yapılandırmaya bağlıdır."
      ],
      [
        "7. Veri Güvenliği",
        "Kişisel verilerin yetkisiz erişime, kayba ve kötüye kullanıma karşı korunması için uygun teknik ve idari tedbirlerin alınması hedeflenir. Bununla birlikte internet üzerinden gerçekleştirilen hiçbir veri aktarımının tamamen risksiz olduğu garanti edilemez."
      ],
      [
        "8. Kullanıcı Kontrolleri",
        "Kullanıcılar mevcut gizlilik ayarları üzerinden hesaplarını gizli hâle getirebilir, diğer kullanıcıları engelleyebilir, içeriklerini silebilir ve hesaplarını kapatabilir."
      ],
      [
        "9. Politika Değişiklikleri",
        "Bu politika gerektiğinde güncellenebilir. Güncel metin platform üzerinde yayımlanır."
      ],
      [
        "10. İletişim",
        "Gizlilik ve kişisel verilerle ilgili sorularınız için mehmet123ibrahim123@gmail.com adresinden iletişime geçebilirsiniz."
      ]
    ]
  },

  kosullar: {
    t: "Kullanım Koşulları",
    intro:
      "Son Kural Bükücü platformuna hoş geldiniz. Platformu kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen platformu kullanmadan önce bu koşulları dikkatlice okuyunuz.",
    s: [
      [
        "1. Üyelik ve Hesap Oluşturma",
        "Platformda hesap oluştururken doğru ve güncel bilgiler verilmelidir. Kullanıcılar hesaplarının güvenliğinden ve hesapları üzerinden gerçekleştirilen işlemlerden sorumludur."
      ],
      [
        "2. Yaş Sınırı",
        "Platforma 13 yaşından küçük kişiler üye olamaz. Reşit olmayan kullanıcıların platformu kullanırken gerekli veli veya vasi gözetimine sahip olması gerekir. Uygulanabilir mevzuattaki daha yüksek yaş veya izin şartları saklıdır."
      ],
      [
        "3. Kullanıcı İçerikleri",
        "Kullanıcılar gönderi, hikâye, fotoğraf, video, yorum ve mesaj paylaşabilir. Paylaşılan içeriklerin hukuka uygun olması ve başkalarının kişilik haklarını, gizliliğini ve telif haklarını ihlal etmemesi gerekir."
      ],
      [
        "4. Yasaklı Davranışlar",
        "Taciz, tehdit, zorbalık, nefret söylemi, dolandırıcılık, spam, izinsiz kişisel veri paylaşımı, başkalarının hesaplarına erişmeye çalışma, yasa dışı faaliyetler ve zararlı yazılım yayma yasaktır."
      ],
      [
        "5. Telif Hakları",
        "Kullanıcılar yalnızca paylaşma hakkına sahip oldukları içerikleri yüklemelidir. Başkalarına ait fotoğraf, video, metin ve diğer çalışmaların izinsiz kullanılması yasaktır."
      ],
      [
        "6. Moderasyon ve Şikâyet",
        "Kullanıcılar kurallara aykırı içerikleri şikâyet edebilir. Platform yönetimi bildirilen içerikleri inceleyebilir; gerekli durumlarda içeriği kaldırabilir, hesabı geçici olarak kısıtlayabilir veya askıya alabilir."
      ],
      [
        "7. Engelleme ve Gizlilik",
        "Kullanıcılar diğer hesapları engelleyebilir ve mevcut gizlilik ayarlarını kullanabilir. Kullanıcılar, platformdaki diğer kişilerin gizlilik haklarına saygı göstermelidir."
      ],
      [
        "8. Hizmetin Sürekliliği",
        "Bakım, teknik sorunlar, güvenlik ihtiyaçları veya mücbir sebepler nedeniyle platformun bazı özellikleri geçici olarak kullanılamayabilir."
      ],
      [
        "9. Hesap Silme",
        "Kullanıcılar hesaplarını platformda sunulan hesap silme özelliği üzerinden kapatabilir. Silme işleminin kapsamı ve yasal saklama yükümlülükleri ilgili mevzuata tabidir."
      ],
      [
        "10. Koşulların Güncellenmesi",
        "Bu koşullar gerektiğinde güncellenebilir. Değişiklikler platformda yayımlandığı tarihten itibaren geçerli olur."
      ],
      [
        "11. İletişim",
        "Kullanım koşullarıyla ilgili sorularınız için mehmet123ibrahim123@gmail.com adresinden iletişime geçebilirsiniz."
      ]
    ]
  },

  kvkk: {
    t: "KVKK Aydınlatma Metni",
    intro:
      "Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında Son Kural Bükücü platformu aracılığıyla işlenen kişisel veriler hakkında bilgi vermek amacıyla hazırlanmıştır.",
    s: [
      [
        "1. Veri Sorumlusu",
        "Veri sorumlusu: [VERİ SORUMLUSUNUN GERÇEK ADI VE SOYADI / İŞLETME ÜNVANI]. İletişim: mehmet123ibrahim123@gmail.com."
      ],
      [
        "2. İşlenen Kişisel Veriler",
        "Kimlik ve hesap bilgileri (kullanıcı adı), iletişim bilgileri (e-posta adresi), kullanıcı işlem bilgileri, profil bilgileri, görsel ve işitsel içerikler, mesajlaşma ve paylaşım verileri ile işlem güvenliği bilgileri işlenebilir."
      ],
      [
        "3. Kişisel Verilerin İşlenme Amaçları",
        "Kişisel veriler; üyelik ve hesap yönetimi, platform hizmetlerinin sunulması, gönderi ve hikâye paylaşımı, mesajlaşma, kullanıcı güvenliğinin sağlanması, şikâyetlerin değerlendirilmesi, kötüye kullanımın önlenmesi ve hukuki yükümlülüklerin yerine getirilmesi amaçlarıyla işlenebilir."
      ],
      [
        "4. Hukuki Sebepler",
        "Kişisel veriler, KVKK'nın 5. maddesinde belirtilen ilgili hukuki işleme şartlarına dayanılarak işlenir. Bunlar arasında sözleşmenin kurulması veya ifası, hukuki yükümlülüklerin yerine getirilmesi, bir hakkın tesisi veya korunması ve gerekli durumlarda meşru menfaat bulunabilir. Açık rıza gereken işlemler için ayrıca rıza alınır."
      ],
      [
        "5. Kişisel Verilerin Aktarılması",
        "Kişisel veriler, hizmetlerin sunulması ve teknik altyapının işletilmesi amacıyla Supabase ve Vercel gibi hizmet sağlayıcılara aktarılabilir. Yurt dışına aktarım söz konusu olduğunda KVKK'nın 9. maddesindeki şartlara uygun hareket edilir."
      ],
      [
        "6. Saklama Süresi",
        "Kişisel veriler, işlenme amaçları için gerekli olan süre boyunca ve ilgili mevzuatta öngörülen saklama sürelerine uygun olarak muhafaza edilir. Saklama sebebi ortadan kalktığında mevzuata uygun şekilde silinir, yok edilir veya anonim hâle getirilir."
      ],
      [
        "7. KVKK Kapsamındaki Haklarınız",
        "KVKK'nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik veya yanlış verilerin düzeltilmesini isteme, şartları oluştuğunda silinmesini veya yok edilmesini isteme ve kanunda belirtilen diğer haklarınızı kullanma hakkına sahipsiniz."
      ],
      [
        "8. Başvuru Yöntemi",
        "KVKK kapsamındaki taleplerinizi mehmet123ibrahim123@gmail.com adresine iletebilirsiniz. Başvurular, ilgili mevzuatta öngörülen usul ve süreler çerçevesinde değerlendirilir."
      ]
    ]
  }
};

export default function Legal({ k }: { k: keyof typeof DOCS }) {
  const d = DOCS[k];

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/" className="text-sm text-accent">
        ← Ana Sayfaya Dön
      </Link>

      <h1 className="my-4 text-2xl font-bold">{d.t}</h1>

      <p className="mb-6 text-sm leading-7 opacity-80">
        {d.intro}
      </p>

      {d.s.map(([h, t]) => (
        <section key={h} className="mb-6">
          <h2 className="mb-2 font-semibold">{h}</h2>
          <p className="text-sm leading-7 opacity-80">{t}</p>
        </section>
      ))}

      <div className="mt-8 border-t pt-4">
        <p className="text-xs opacity-50">
          Son güncelleme: 26 Kasım 2026
        </p>
        <p className="mt-2 text-xs opacity-50">
          Son Kural Bükücü © 2026
        </p>
      </div>
    </main>
  );
}
