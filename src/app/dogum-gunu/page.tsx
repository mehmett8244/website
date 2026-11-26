
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Gift,
  Cake,
  Camera,
  Sparkles,
  Star,
  Mail,
  ArrowDown,
  Music2,
} from "lucide-react";

// BURAYI KENDİNE GÖRE DÜZENLE
const friendName = "Irmaak";
const birthdayMessage =
  "İyi ki doğdun Irmoo! zor zamanlarımda bana destek olduğun için; beni bir arkadaştan çok kardeş olarak gördüğün için teşekkür ederim. Umarım yeni yaşın sana mutluluk, huzur ve unutulmaz güzellikler getirir.";

const memories = [
  {
    date: "İlk anımız",
    title: "Her şeyin başladığı gün...",
    description:
      "Sınıfa ilk girdiğim gün Merve hocanın beni öne almasıyla arkadaşlığımız pekişmişti",
    emoji: "✨",
  },
  {
    date: "Unutulmaz bir gün",
    title: "Boyama zamanı!",
    description:
      "Bütün sınıf anı t-shirtü yapma kararı almıştık ve guaj boyalarla birbirimizi boyamıştık",
    emoji: "🎨",
  },
  {
    date: "Güzel zamanlar",
    title: "Birlikte geçirdiğimiz günler",
    description:
      "Birlikte yaptığımız taklitler videoları vs. belki gerçek hayatta çok konuşamadık fakat her zaman benim için değerli bir arkadaşsın.. ",
    emoji: "❤️",
  },
  {
    date: "Daima hatırlanacak",
    title: "Daha nice anılara...",
    description:
      "Bu yılı iyisiyle kötüsüyle atlattık yeni yılda yeni maceralarda tekrar birbirimize destek olmak üzere.",
    emoji: "🌙",
  },
];

export default function BirthdayPage() {
  const [letterOpen, setLetterOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#100d1b] text-white">

      {/* ARKA PLAN */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-96 h-96 w-96 rounded-full bg-pink-500/20 blur-[120px]" />
      </div>

      {/* KARŞILAMA */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 py-20 text-center">

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-pink-300">
            <Sparkles size={16} />
            Bugün senin günün!
          </div>

          <motion.div
            animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="mb-8 text-7xl"
          >
            🎂
          </motion.div>

          <p className="mb-4 text-sm font-medium uppercase tracking-[0.4em] text-purple-300">
            Özel bir gün, özel bir insan
          </p>

          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            İyi ki
            <span className="block bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Doğdun!
            </span>
          </h1>

          <h2 className="mt-6 text-2xl font-semibold text-white/90">
            {friendName} ❤️
          </h2>

          <p className="mx-auto mt-6 max-w-lg leading-8 text-white/55">
            Bazı insanlar hayatımıza girer ve sıradan günleri bile
            unutulmaz anılara dönüştürür. Bu sayfa onlardan biri için.
          </p>

          <a
            href="#mesaj"
            className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-4 font-bold shadow-xl shadow-purple-900/30 transition hover:scale-105"
          >
            Senin için hazırlandı
            <Heart size={19} />
          </a>
        </motion.div>

        <div className="absolute bottom-8 animate-bounce text-white/40">
          <ArrowDown size={25} />
        </div>
      </section>

      {/* DOĞUM GÜNÜ MESAJI */}
      <section id="mesaj" className="relative mx-auto max-w-4xl px-6 py-24">

        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-14">

          <Gift className="mx-auto mb-6 text-pink-400" size={42} />

          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-purple-300">
            Sana küçük bir not
          </p>

          <h2 className="mb-8 text-3xl font-bold sm:text-4xl">
            Bugün senin günün.
          </h2>

          <p className="mx-auto max-w-2xl text-lg leading-9 text-white/70">
            {birthdayMessage}
          </p>

          <div className="mt-8 flex justify-center gap-3 text-pink-400">
            <Heart fill="currentColor" />
            <Heart fill="currentColor" />
            <Heart fill="currentColor" />
          </div>
        </div>
      </section>

      {/* ANI DEFTERİ */}
      <section id="anilar" className="relative mx-auto max-w-5xl px-6 py-24">

        <div className="mb-16 text-center">
          <div className="mb-5 flex justify-center">
            <Camera size={38} className="text-purple-400" />
          </div>

          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-purple-300">
            Küçük bir zaman yolculuğu
          </p>

          <h2 className="text-4xl font-black sm:text-5xl">
            Anılarımız
          </h2>

          <p className="mx-auto mt-5 max-w-lg leading-7 text-white/50">
            Zaman geçer, günler değişir ama bazı anılar
            hep aynı güzellikte kalır.
          </p>
        </div>

        <div className="relative space-y-7">
          <div className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-pink-500 via-purple-500 to-transparent sm:left-1/2" />

          {memories.map((memory, index) => (
            <motion.div
              key={memory.title}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className={`relative flex ${
                index % 2 === 0
                  ? "sm:justify-start"
                  : "sm:justify-end"
              }`}
            >
              <div className="absolute left-[21px] top-7 z-10 h-3.5 w-3.5 rounded-full border-2 border-pink-400 bg-[#100d1b] sm:left-1/2 sm:-translate-x-1/2" />

              <div className="ml-16 w-full rounded-3xl border border-white/10 bg-white/[0.045] p-6 transition hover:border-purple-400/40 hover:bg-white/[0.07] sm:ml-0 sm:w-[44%]">

                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                    {memory.date}
                  </span>
                  <span className="text-2xl">{memory.emoji}</span>
                </div>

                <h3 className="mb-3 text-xl font-bold">
                  {memory.title}
                </h3>

                <p className="text-sm leading-7 text-white/55">
                  {memory.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

  {[
    {
      src: "/images/birthday/sınıf1.jpeg",
      caption: "Hocamız ve efektleri",
    },
    {
      src: "/images/birthday/sınıf2.jpeg",
      caption: "Yat babam yat",
    },
    {
      src: "/images/birthday/sınıf3.jpeg",
      caption: "Huriyenin etrafa bakınması alsksldkd",
    },
  ].map((photo, index) => (
    <motion.div
      key={photo.src}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={photo.src}
          alt={photo.caption}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
      </div>

      <p className="p-4 text-center text-sm text-white/70">
        {photo.caption}
      </p>
    </motion.div>
  ))}

</div>


      {/* ÖZEL MEKTUP */}
      <section className="relative mx-auto max-w-3xl px-6 py-24 text-center">

        <Mail className="mx-auto mb-6 text-pink-400" size={42} />

        <h2 className="mb-5 text-3xl font-black sm:text-4xl">
          Son olarak...
        </h2>

        <p className="mb-10 text-white/50">
          Sana söylemek istediğim birkaç şey daha var.
        </p>

        <button
          onClick={() => setLetterOpen(!letterOpen)}
          className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-9 py-4 font-bold shadow-xl shadow-purple-900/30 transition hover:scale-105"
        >
          {letterOpen ? "Mektubu kapat ❤️" : "Mektubunu aç 💌"}
        </button>

        <AnimatePresence>
          {letterOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="mt-10 rounded-3xl border border-pink-400/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 text-left sm:p-12"
            >
              <h3 className="mb-6 text-2xl font-bold text-pink-300">
                Sevgili {friendName},
              </h3>

              <p className="whitespace-pre-line leading-9 text-white/75">
                Hayatımıza birçok insan girip çıkıyor. Bazılarıyla sadece birkaç anı biriktiriyoruz bazılarıysa farkında bile olmadan hayatımızda güzel bir yer ediniyor. Sen de benim için o insanlardan birisin. Belki her zaman dile getirmiyorum ama seni tanıdığıma ve hayatımda senin gibi bir insan olduğuna gerçekten mutluyum.

Her anın büyük bir anlam taşımasına gerek yok. Bazen sadece bir insanın varlığı bile gününü güzelleştirmeye yetiyor.

Umarım yeni yaşında yüzünü güldürecek birçok şey yaşarsın. Hayallerine birer birer ulaşırsın, karşına hep güzel insanlar çıkar ve hiçbir zaman kendini yalnız hissetmezsin. Hayat bazen istediğimiz gibi gitmese de umarım hiçbir şey içindeki o güzel tarafı değiştirmez...

Belki yıllar sonra bugünleri hatırladığımızda birçok şey değişmiş olacak. Belki farklı yerlerde, farklı hayatlarda olacağız. Ama umarım geriye dönüp baktığımızda yüzümüzde bir tebessüm oluşturacak güzel anılarımız olur.

Kısacası, iyi ki doğmuşsun, iyi ki tanımışım seni. Yeni yaşın sana mutluluk, huzur ve unutamayacağın güzellikler getirsin nice yaşlaraa
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-white/10 px-6 py-12 text-center">

        <div className="mb-5 flex justify-center gap-3 text-pink-400">
          <Star size={18} />
          <Heart size={18} fill="currentColor" />
          <Star size={18} />
        </div>

        <h3 className="text-xl font-bold">
          İyi ki doğdun {friendName}!
        </h3>

        <p className="mt-3 text-sm text-white/35">
          Bu sayfa senin için, tüm güzel anılarımıza...
        </p>

        <p className="mt-8 text-xs text-white/25">
          Son Kural Bükücü - Mehmett8244 Sevgilerle...
        </p>
      </footer>

    </main>
  );
}
