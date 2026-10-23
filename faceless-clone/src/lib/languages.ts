export type LanguageOption = {
  code: string;
  name: string;
  flag: string;
  edgeLocale: string;
  edgeMale: string;
  edgeFemale: string;
};

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", flag: "🇬🇧", edgeLocale: "en-US", edgeMale: "en-US-AndrewNeural", edgeFemale: "en-US-AriaNeural" },
  { code: "es", name: "Spanish", flag: "🇪🇸", edgeLocale: "es-ES", edgeMale: "es-ES-AlvaroNeural", edgeFemale: "es-ES-ElviraNeural" },
  { code: "fr", name: "French", flag: "🇫🇷", edgeLocale: "fr-FR", edgeMale: "fr-FR-HenriNeural", edgeFemale: "fr-FR-DeniseNeural" },
  { code: "de", name: "German", flag: "🇩🇪", edgeLocale: "de-DE", edgeMale: "de-DE-ConradNeural", edgeFemale: "de-DE-KatjaNeural" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", edgeLocale: "pt-BR", edgeMale: "pt-BR-AntonioNeural", edgeFemale: "pt-BR-FranciscaNeural" },
  { code: "it", name: "Italian", flag: "🇮🇹", edgeLocale: "it-IT", edgeMale: "it-IT-DiegoNeural", edgeFemale: "it-IT-ElsaNeural" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", edgeLocale: "hi-IN", edgeMale: "hi-IN-MadhurNeural", edgeFemale: "hi-IN-SwaraNeural" },
  { code: "ur", name: "Urdu", flag: "🇵🇰", edgeLocale: "ur-PK", edgeMale: "ur-PK-AsadNeural", edgeFemale: "ur-PK-UzmaNeural" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", edgeLocale: "ar-SA", edgeMale: "ar-SA-HamedNeural", edgeFemale: "ar-SA-ZariyahNeural" },
  { code: "id", name: "Indonesian", flag: "🇮🇩", edgeLocale: "id-ID", edgeMale: "id-ID-ArdiNeural", edgeFemale: "id-ID-GadisNeural" },
  { code: "tr", name: "Turkish", flag: "🇹🇷", edgeLocale: "tr-TR", edgeMale: "tr-TR-AhmetNeural", edgeFemale: "tr-TR-EmelNeural" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", edgeLocale: "ja-JP", edgeMale: "ja-JP-KeitaNeural", edgeFemale: "ja-JP-NanamiNeural" },
  { code: "ko", name: "Korean", flag: "🇰🇷", edgeLocale: "ko-KR", edgeMale: "ko-KR-InJoonNeural", edgeFemale: "ko-KR-SunHiNeural" },
];

const PROVIDER_LANGS: Record<string, string[]> = {
  edge: LANGUAGES.map((language) => language.code),
  elevenlabs: LANGUAGES.map((language) => language.code),
  kokoro: ["en", "es", "fr", "ja", "zh", "hi"],
};

export function languagesForProvider(provider: string) {
  const allowed = new Set(PROVIDER_LANGS[provider] ?? PROVIDER_LANGS.edge);
  return LANGUAGES.filter((language) => allowed.has(language.code));
}

export function languageByCode(code: string) {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]!;
}
