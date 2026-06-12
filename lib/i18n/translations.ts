export type Locale = "en" | "id";

export const translations = {
  en: {
    meta: {
      title: "Unspoken — Decode What They Really Meant",
      description:
        "Figure out what your partner actually meant. AI-powered relationship communication decoder.",
      ogTitle: "Unspoken",
      ogDescription: "Finally understand what your partner really meant.",
    },
    header: {
      badge: "Reading Between the Lines",
      tagline: "Type what your partner said. Find out what they really meant.",
    },
    footer: {
      privacy: "Your chats are saved privately so you can pick up where you left off.",
    },
    input: {
      label: "What'd they say or do?",
      placeholder:
        'e.g. "Fine, do whatever you want" when I asked about weekend plans...',
      ariaLabel: "Describe what your partner said or did",
      submit: "Decode It",
      submitting: "Figuring it out...",
      examples: [
        '"Fine, do whatever you want"',
        '"I\'m not mad"',
        '"You never listen to me"',
      ],
    },
    results: {
      decodedSignal: "What They Really Meant",
      underlyingNeed: "What They Actually Need",
      threatLevel: "How Serious Is This",
      actionPlan: "What You Should Do",
      translateAnother: "Decode Another One",
      steps: (n: number) => `${n} step${n !== 1 ? "s" : ""}`,
    },
    streaming: {
      status: "Figuring it out",
      phase: {
        analyzing: "Reading the situation...",
        decoding: "Unpacking what they meant...",
        identifying: "Finding what they need...",
        building: "Putting together a game plan...",
        finishing: "Almost there...",
      },
    },
    actions: {
      markComplete: "Done this",
      markIncomplete: "Not done yet",
      tryAgain: "Try Again",
      copy: "Copy",
      copied: "Copied!",
    },
    urgency: {
      1: {
        label: "All good",
        desc: "No tension here. They're being straight with you — relax, nothing to worry about.",
      },
      2: {
        label: "Heads up",
        desc: "A little friction in the air. Keep it in mind, but no need to panic — just stay tuned in.",
      },
      3: {
        label: "Check in with them",
        desc: "Something's off. They've got a need that's going unmet — better address it soon before it snowballs.",
      },
      4: {
        label: "Handle this today",
        desc: "Things are brewing. Letting this slide will only make it worse — reach out before the day is over.",
      },
      5: {
        label: "Drop everything now",
        desc: "They've hit their limit. Stop what you're doing and deal with this right now — this can't wait.",
      },
      score: (n: number, label: string) => `${n}/5 — ${label}`,
    },
    errors: {
      network: "Can't connect right now. Check your internet and give it another shot.",
      generic: "Hmm, something went wrong. Mind trying again?",
      streamUnavailable: "Lost the connection mid-stream. Try again?",
      streamInterrupted: "Got cut off. Want to try that again?",
      emptyInput: "Tell me what they said or did first!",
      inputTooLong: "Keep it under 500 characters and try again.",
      offTopic:
        "I'm just here for relationship stuff — what your partner said or did, mixed signals, that kind of thing. Tell me what's going on with them and I've got you.",
    },
    settings: {
      title: "AI Settings",
      menuTitle: "Settings",
      account: "Account",
      language: "Language",
      provider: "Provider",
      model: "Model",
      apiKey: "API Key",
      apiKeyPlaceholder: "Paste your API key here...",
      apiKeyHint: "Saved right in your browser — never touches our servers.",
      useServerDefault: "Use server default",
      providerLabels: {
        openai: "OpenAI",
        anthropic: "Anthropic",
        gemini: "Google Gemini",
        groq: "Groq",
      },
    },
    chat: {
      roomsTitle: "Your Chats",
      newChat: "New chat",
      noRooms: "No chats yet. Start one to decode a message.",
      emptyTitle: "Decode a message",
      emptySubtitle:
        "Tell Unspoken what your partner said or did to start a new chat.",
      replyPlaceholder: "Reply to Unspoken…",
      send: "Send",
      thinking: "Unspoken is thinking…",
      delete: "Delete chat",
      deleteConfirm: "Delete this chat and all its messages?",
      you: "You",
      menu: "Chats",
      loadError: "Couldn't load this chat. Try again.",
      skipClarify: "Skip & decode now",
      clarifyHint: "A few quick questions first to get a sharper read.",
    },
    suggestions: {
      heading: "Suggested replies",
      quickActions: {
        copy: "Copy summary",
      },
    },
    auth: {
      signInTitle: "Welcome back",
      signUpTitle: "Create your account",
      toggleSignIn: "Already have an account? Sign in",
      toggleSignUp: "No account yet? Sign up",
      nameLabel: "Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Min. 8 characters",
      submitSignIn: "Sign in",
      submitSignUp: "Sign up",
      submitting: "Please wait…",
      signOut: "Sign out",
      errorEmailTaken: "An account with that email already exists.",
      errorInvalidCredentials: "Invalid email or password.",
      errorGeneric: "Something went wrong. Please try again.",
    },
  },
  id: {
    meta: {
      title: "Unspoken — Pahami Maksud Sebenarnya",
      description:
        "Cari tahu apa yang sebenarnya dimaksud pasanganmu. Dekoder komunikasi hubungan berbasis AI.",
      ogTitle: "Unspoken",
      ogDescription: "Akhirnya paham apa yang dia sebenarnya maksud.",
    },
    header: {
      badge: "Baca Maksud Tersirat",
      tagline: "Ketik apa yang dia bilang. Kita cari tahu maksud sebenarnya.",
    },
    footer: {
      privacy:
        "Obrolanmu disimpan secara privat biar kamu bisa lanjutin kapan aja.",
    },
    input: {
      label: "Pasanganmu bilang atau ngelakuin apa?",
      placeholder:
        'mis. "Terserah kamu aja deh" waktu aku tanya rencana akhir pekan...',
      ariaLabel: "Ceritain apa yang pasanganmu bilang atau lakuin",
      submit: "Pahami Sekarang",
      submitting: "Lagi mikirin ini...",
      examples: [
        '"Terserah kamu aja deh"',
        '"Aku nggak marah kok"',
        '"Kamu nggak pernah dengerin aku"',
      ],
    },
    results: {
      decodedSignal: "Maksud Sebenarnya",
      underlyingNeed: "Yang Sebenarnya Dibutuhkan",
      threatLevel: "Seberapa Serius Ini",
      actionPlan: "Yang Harus Kamu Lakuin",
      translateAnother: "Coba yang Lain",
      steps: (n: number) => `${n} langkah`,
    },
    streaming: {
      status: "Lagi nganalisis nih",
      phase: {
        analyzing: "Baca situasinya dulu...",
        decoding: "Bedah maksudnya...",
        identifying: "Cari tahu apa yang pasanganmu butuhin...",
        building: "Nyusun rencana buat kamu...",
        finishing: "Hampir selesai...",
      },
    },
    actions: {
      markComplete: "Udah dilakuin",
      markIncomplete: "Belum dilakuin",
      tryAgain: "Coba Lagi",
      copy: "Salin",
      copied: "Tersalin!",
    },
    urgency: {
      1: {
        label: "Santai aja",
        desc: "Nggak ada ketegangan. Dia lagi ngomong apa adanya — nggak perlu khawatir.",
      },
      2: {
        label: "Perhatiin dikit",
        desc: "Ada sedikit yang mengganjal. Perlu diingat, tapi nggak darurat — tetap peka ya.",
      },
      3: {
        label: "Mending dicek dulu",
        desc: "Ada yang nggak beres nih. Dia punya kebutuhan yang belum terpenuhi — mending diatasi sebelum makin runyam.",
      },
      4: {
        label: "Tangani hari ini",
        desc: "Situasinya makin panas. Kalau dibiarkan bakal makin parah — hubungi dia sebelum hari ini berakhir.",
      },
      5: {
        label: "Segera sekarang juga",
        desc: "Dia udah di ujung kesabaran. Hentikan apapun yang kamu lakuin dan selesaikan ini sekarang — nggak bisa nunggu.",
      },
      score: (n: number, label: string) => `${n}/5 — ${label}`,
    },
    errors: {
      network: "Koneksi lagi bermasalah nih. Cek internet kamu terus coba lagi ya.",
      generic: "Hmm, ada yang error. Coba lagi dong?",
      streamUnavailable: "Koneksi terputus di tengah jalan. Coba lagi?",
      streamInterrupted: "Kecutup tiba-tiba. Mau coba lagi?",
      emptyInput: "Ceritain dulu dong apa yang pasanganmu bilang atau lakuin!",
      inputTooLong: "Maksimal 500 karakter ya, coba dipersingkat dulu.",
      offTopic:
        "Aku cuma bisa bantu soal hubungan kok — apa yang pasangan kamu bilang atau lakuin, sinyal campur aduk, hal-hal kayak gitu. Cerita aja ada apa sama dia, nanti aku bantu.",
    },
    settings: {
      title: "Pengaturan AI",
      menuTitle: "Pengaturan",
      account: "Akun",
      language: "Bahasa",
      provider: "Provider",
      model: "Model",
      apiKey: "API Key",
      apiKeyPlaceholder: "Tempel API key kamu di sini...",
      apiKeyHint: "Disimpan di browser kamu aja — nggak pernah nyentuh server kami.",
      useServerDefault: "Pakai bawaan server",
      providerLabels: {
        openai: "OpenAI",
        anthropic: "Anthropic",
        gemini: "Google Gemini",
        groq: "Groq",
      },
    },
    chat: {
      roomsTitle: "Obrolan Kamu",
      newChat: "Obrolan baru",
      noRooms: "Belum ada obrolan. Mulai satu untuk memahami sebuah pesan.",
      emptyTitle: "Pahami sebuah pesan",
      emptySubtitle:
        "Ceritain ke Unspoken apa yang pasanganmu bilang atau lakuin untuk memulai obrolan baru.",
      replyPlaceholder: "Balas ke Unspoken…",
      send: "Kirim",
      thinking: "Unspoken lagi mikir…",
      delete: "Hapus obrolan",
      deleteConfirm: "Hapus obrolan ini beserta semua pesannya?",
      you: "Kamu",
      menu: "Obrolan",
      loadError: "Gagal memuat obrolan ini. Coba lagi.",
      skipClarify: "Lewati & decode sekarang",
      clarifyHint: "Beberapa pertanyaan singkat dulu biar tafsirannya lebih tajam.",
    },
    suggestions: {
      heading: "Saran balasan",
      quickActions: {
        copy: "Salin ringkasan",
      },
    },
    auth: {
      signInTitle: "Selamat datang kembali",
      signUpTitle: "Buat akun kamu",
      toggleSignIn: "Sudah punya akun? Masuk",
      toggleSignUp: "Belum punya akun? Daftar",
      nameLabel: "Nama",
      namePlaceholder: "Nama kamu",
      emailLabel: "Email",
      emailPlaceholder: "kamu@contoh.com",
      passwordLabel: "Kata sandi",
      passwordPlaceholder: "Min. 8 karakter",
      submitSignIn: "Masuk",
      submitSignUp: "Daftar",
      submitting: "Sebentar ya…",
      signOut: "Keluar",
      errorEmailTaken: "Akun dengan email itu sudah ada.",
      errorInvalidCredentials: "Email atau kata sandi salah.",
      errorGeneric: "Ada yang error. Coba lagi ya.",
    },
  },
};

export type Translations = (typeof translations)["en"];
