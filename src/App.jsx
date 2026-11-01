
import { useState, useEffect, useRef } from "react";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

const FALLBACK = {
  en: {
    text: "The secret of getting ahead is getting started. Every small step brings you closer to the person you want to become.",
    author: "Mark Twain",
  },
  es: {
    text: "El secreto para avanzar es comenzar. Cada pequeño paso te acerca a la persona que quieres llegar a ser.",
    author: "Inspirational quote",
  },
  fr: {
    text: "Le secret pour avancer est de commencer. Chaque petit pas vous rapproche de la personne que vous souhaitez devenir.",
    author: "Citation inspirante",
  },
  it: {
    text: "Il segreto per andare avanti è iniziare. Ogni piccolo passo ti avvicina alla persona che vuoi diventare.",
    author: "Citazione ispiratrice",
  },
  pt: {
    text: "O segredo para seguir em frente é começar. Cada pequeno passo aproxima você da pessoa que deseja se tornar.",
    author: "Citação inspiradora",
  },
  de: {
    text: "Das Geheimnis des Fortschritts besteht darin, anzufangen. Jeder kleine Schritt bringt dich deinem Ziel näher.",
    author: "Inspirierendes Zitat",
  },
};

const API = "https://dummyjson.com/quotes/random";

export default function App() {
  const [selected, setSelected] = useState(["en"]);
  const [allLanguages, setAllLanguages] = useState(false);

  const [paragraph, setParagraph] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("en");

  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(0);
  const [characters, setCharacters] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const loadingRef = useRef(false);

  const words = paragraph.trim()
    ? paragraph.trim().split(/\s+/)
    : [];

  const currentWord = words[wordIndex] || "";

  const accuracy =
    characters + mistakes > 0
      ? Math.round(
          (characters / (characters + mistakes)) * 100
        )
      : 100;

  function toggleLanguage(code) {
    setAllLanguages(false);

    setSelected((previous) => {
      if (previous.includes(code)) {
        if (previous.length === 1) return previous;
        return previous.filter((item) => item !== code);
      }

      return [...previous, code];
    });
  }

  function selectAll() {
    setAllLanguages(true);
    setSelected(LANGUAGES.map((l) => l.code));
  }

  function resetTyping() {
    clearTimeout(timerRef.current);
    setWordIndex(0);
    setTyped("");
    setError(false);
    setCharacters(0);
    setMistakes(0);
  }

  async function getNewParagraph() {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setMessage("");

    window.speechSynthesis?.cancel();
    setSpeaking(false);

    const pool = allLanguages
      ? LANGUAGES
      : LANGUAGES.filter((l) => selected.includes(l.code));

    const chosen =
      pool[Math.floor(Math.random() * pool.length)];

    setLanguage(chosen.code);

    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error("Quote API unavailable");
      }

      const data = await response.json();

      let text = data.quote;
      const quoteAuthor = data.author || "Unknown";

      if (chosen.code !== "en") {
        const params = new URLSearchParams({
          q: text,
          langpair: `en|${chosen.code}`,
        });

        const translationResponse = await fetch(
          `https://api.mymemory.translated.net/get?${params}`
        );

        if (!translationResponse.ok) {
          throw new Error("Translation unavailable");
        }

        const translationData = await translationResponse.json();

        const translated =
          translationData.responseData?.translatedText;

        if (
          !translated ||
          translationData.responseStatus !== 200 ||
          translated.toLowerCase() === text.toLowerCase()
        ) {
          throw new Error("Translation unavailable");
        }

        text = translated;
      }

      setParagraph(text);
      setAuthor(quoteAuthor);
    } catch (err) {
      const fallback = FALLBACK[chosen.code];

      setParagraph(fallback.text);
      setAuthor(fallback.author);

      setMessage("Using offline content.");
    } finally {
      resetTyping();
      setLoading(false);
      loadingRef.current = false;

      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }

  useEffect(() => {
    getNewParagraph();

    return () => {
      clearTimeout(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // CONTROLLED TYPING ENGINE
  // Works with physical and virtual keyboards.

  function handleTyping(event) {
    if (loading || error || !currentWord) return;

    const value = event.target.value;

    // Ignore empty changes and accidental whitespace.
    // Spaces never count as mistakes.
    if (value === typed) return;

    if (value.length < typed.length) {
      // Backspace.
      setTyped(value);
      return;
    }

    // Only process one new character at a time.
    if (value.length !== typed.length + 1) {
      inputRef.current.value = typed;
      return;
    }

    const newCharacter = value[value.length - 1];
    const expected = currentWord[typed.length];

    // Ignore spaces rather than marking them incorrect.
    if (/\s/.test(newCharacter)) {
      inputRef.current.value = typed;
      return;
    }

    if (newCharacter !== expected) {
      setMistakes((m) => m + 1);

      const newTyped = typed + newCharacter;
      setTyped(newTyped);

      if (newTyped.length >= currentWord.length) {
        setError(true);

        timerRef.current = setTimeout(() => {
          setTyped("");
          setError(false);

          if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
          }
        }, 750);
      }

      return;
    }

    const newTyped = typed + newCharacter;

    setCharacters((c) => c + 1);
    setTyped(newTyped);

    if (newTyped.length === currentWord.length) {
      const next = wordIndex + 1;

      if (next >= words.length) {
        setCompleted((c) => c + 1);

        setTimeout(() => {
          getNewParagraph();
        }, 500);
      } else {
        setWordIndex(next);

        // Clear the input for the next word.
        if (inputRef.current) {
          inputRef.current.value = "";
        }

        setTyped("");
      }
    }
  }

  function speak() {
    if (!paragraph || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(paragraph);

    utterance.lang = language;
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();

    const matchingVoice = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(language)
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);

    inputRef.current?.focus();
  }

  const progress = words.length
    ? Math.round((wordIndex / words.length) * 100)
    : 0;

  const currentLanguage = LANGUAGES.find(
    (l) => l.code === language
  );

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100">

      {/* NAVIGATION */}

      <nav className="border-b border-white/[0.07] bg-[#0c0f16]">
        <div className="mx-auto max-w-7xl px-5 py-5">

          <div className="flex flex-wrap items-center justify-between gap-5">

            <a href="#" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-xl font-bold text-indigo-400">
                L
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Lingua<span className="text-indigo-400">Type</span>
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Learn through typing
                </p>
              </div>
            </a>

            <div className="flex flex-wrap items-center gap-2">

              {LANGUAGES.map((lang) => {
                const active =
                  allLanguages || selected.includes(lang.code);

                return (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      active
                        ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-300"
                        : "border-white/[0.07] text-zinc-500 hover:bg-white/5"
                    }`}
                  >
                    {lang.flag} {lang.code.toUpperCase()}
                  </button>
                );
              })}

              <button
                onClick={selectAll}
                className={`rounded-lg border px-3 py-2 text-xs transition ${
                  allLanguages
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-300"
                    : "border-white/[0.07] text-zinc-500 hover:bg-white/5"
                }`}
              >
                ALL
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}

      <main className="mx-auto max-w-5xl px-5 py-12">

       {/*  <div className="mb-12 text-center">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Language learning through typing
          </div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Words become
            <span className="text-indigo-400"> knowledge.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-500">
            Read, listen and type your way through beautiful
            paragraphs in the languages you want to master.
          </p>

        </div> */}

        {/* STATISTICS */}

        <div className="mb-8 grid grid-cols-3 gap-3">

          <div className="rounded-2xl border border-white/[0.07] bg-[#11151e] p-4 text-center">
            <p className="text-2xl font-bold">{completed}</p>
            <p className="mt-1 text-xs text-zinc-500">Texts completed</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#11151e] p-4 text-center">
            <p className="text-2xl font-bold">{accuracy}%</p>
            <p className="mt-1 text-xs text-zinc-500">Accuracy</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#11151e] p-4 text-center">
            <p className="text-2xl font-bold">{characters}</p>
            <p className="mt-1 text-xs text-zinc-500">Correct keys</p>
          </div>

        </div>

        {/* PRACTICE CARD */}

        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#11151e] shadow-2xl shadow-black/20">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-6 py-5">

            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Currently practicing
              </p>

              <p className="mt-1 font-semibold">
                {currentLanguage?.flag} {currentLanguage?.name || "Loading..."}
              </p>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={speak}
                disabled={!paragraph || loading}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
              >
                {speaking ? "◼ Stop" : "♫ Listen"}
              </button>

              <button
                onClick={getNewParagraph}
                disabled={loading}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {loading ? "Loading..." : "↻ New text"}
              </button>

            </div>
          </div>

          {/* PROGRESS */}

          <div className="h-1 w-full bg-white/[0.05]">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5 sm:p-10">

            <div className="mb-8 flex items-center justify-between text-xs text-zinc-500">
              <span>YOUR PRACTICE SESSION</span>
              <span>{progress}% completed</span>
            </div>

            {/* TYPING TEXT */}

            <div
              onClick={() => inputRef.current?.focus()}
              className="relative min-h-48 cursor-text touch-manipulation rounded-2xl border border-white/[0.06] bg-[#0b0e15] p-5 sm:p-8"
            >

              {loading ? (
                <div className="flex min-h-36 items-center justify-center text-sm text-zinc-500">
                  Preparing your next paragraph...
                </div>
              ) : (

                <div className="select-none text-lg leading-[2.3] tracking-wide sm:text-2xl">

  {words.map((word, index) => {
    const isDone = index < wordIndex;
    const isCurrent = index === wordIndex;

    return (
      <span
        key={index}
        className={`inline-block whitespace-nowrap mr-[0.3em] rounded-md transition-colors ${
          isDone
            ? "text-emerald-400"
            : isCurrent
              ? error
                ? "bg-red-500/15 text-red-400"
                : "bg-indigo-500/15 text-zinc-100"
              : "text-zinc-600"
        }`}
      >
        {word.split("").map((char, charIndex) => {
          let color = "";

          if (isDone) {
            color = "text-emerald-400";
          } else if (isCurrent) {
            if (error) {
              color = "text-red-400";
            } else if (charIndex < typed.length) {
              color = "text-emerald-400";
            } else if (charIndex === typed.length) {
              color =
                "text-white underline decoration-indigo-400 decoration-2 underline-offset-8";
            }
          }

          return (
            <span key={charIndex} className={color}>
              {char}
            </span>
          );
        })}
      </span>
    );
  })}

</div>
              )}

              {/* MOBILE-FRIENDLY INPUT */}

              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Type the displayed paragraph"
                className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                value={typed}
                onChange={handleTyping}
                onKeyDown={(event) => {
                  if (event.key === " ") {
                    event.preventDefault();
                  }
                }}
                disabled={loading || error}
              />

            </div>

            {/* <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">

              <span>
                {error
                  ? "Incorrect word. Try typing it again."
                  : "Tap the paragraph and start typing."}
              </span>

              <span>
                {wordIndex} / {words.length} words
              </span>

            </div> */}

            {message && (
              <p className="mt-4 text-center text-xs text-amber-400">
                {message}
              </p>
            )}

            {/* AUTHOR */}

            <div className="mt-10 border-t border-white/[0.07] pt-6">

              <p className="text-xs uppercase tracking-widest text-zinc-600">
                A thought to remember
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                — {author || "Unknown"}
              </p>

            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
