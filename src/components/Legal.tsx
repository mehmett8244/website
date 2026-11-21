import Link from "next/link";
const DOCS: Record<string, { t: string; s: [string, string][] }> = {
  gizlilik: { t: "Gizlilik Politikası", s: [
    ["Topladığımız veriler", "Hesap oluştururken e-posta adresi ve kullanıcı adı, kullanım sırasında paylaştığın gönderi, hikâye, yorum, mesaj ve medya dosyaları ile son görülme bilgisi işlenir."],
    ["Kullanım amacı", "Veriler hesabını yönetmek, içerikleri göstermek, mesajlaşmayı sağlamak, bildirim göndermek ve platform güvenliğini sağlamak için kullanılır."],
    ["Paylaşım", "Verilerin reklam amacıyla satılmaz. Altyapı sağlayıcılarımız (veritabanı ve barındırma hizmetleri) verileri bizim adımıza işler."],
    ["Gizlilik ayarların", "Hesabını gizli yapabilir, kullanıcıları engelleyebilir, gönderilerini ve hesabını istediğin zaman silebilirsin."],
    ["İletişim", "[İLETİŞİM E-POSTASI]"]] },
  kosullar: { t: "Kullanım Koşulları", s: [
    ["Kabul", "Platformu kullanarak bu koşulları kabul etmiş olursun. 13 yaşından küçükler hesap açamaz."],
    ["Hesap sorumluluğu", "Hesabının güvenliğinden ve hesabınla yapılan paylaşımlardan sen sorumlusun."],
    ["Yasak içerik", "Taciz, tehdit, nefret söylemi, şiddet, çocukları istismar eden içerik, spam, yasa dışı faaliyet ve başkalarının haklarını ihlal eden paylaşımlar yasaktır."],
    ["Moderasyon", "Kurallara aykırı içerikler kaldırılabilir, ihlal eden hesaplar uyarılmadan askıya alınabilir veya silinebilir. İçerikleri şikâyet et düğmesiyle bildirebilirsin."],
    ["Değişiklik", "Koşullar güncellenebilir; güncel sürüm bu sayfada yayınlanır."],
    ["İletişim", "[İLETİŞİM E-POSTASI]"]] },
  kvkk: { t: "KVKK Aydınlatma Metni", s: [
    ["Veri sorumlusu", "[İŞLETME / KİŞİ ADI] — 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusudur."],
    ["İşlenen veriler ve amaç", "Kimlik ve iletişim bilgileri (kullanıcı adı, e-posta), içerik verileri ve işlem güvenliği verileri; hizmetin sunulması, güvenliğin sağlanması ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir."],
    ["Hukuki sebep", "Sözleşmenin ifası, meşru menfaat ve gerektiğinde açık rıza."],
    ["Aktarım", "Veriler, hizmetin sunulması için gerekli barındırma ve veritabanı sağlayıcılarına, yurt dışı sunucular dahil, aktarılabilir."],
    ["Haklarınız", "KVKK madde 11 kapsamında verilerine erişme, düzeltme, silme ve itiraz haklarına sahipsin. Hesabını profil sayfandan silebilir veya [İLETİŞİM E-POSTASI] adresine başvurabilirsin."]] },
};
export default function Legal({ k }: { k: keyof typeof DOCS }) {
  const d = DOCS[k];
  return (<main className="mx-auto max-w-2xl p-6"><Link href="/" className="text-sm text-accent">← Geri</Link><h1 className="my-4 text-2xl font-bold">{d.t}</h1>
    {d.s.map(([h, t]) => <section key={h} className="mb-4"><h2 className="font-semibold">{h}</h2><p className="text-sm opacity-80">{t}</p></section>)}
    <p className="mt-6 text-xs opacity-50">Son güncelleme: 2026</p></main>);
}
