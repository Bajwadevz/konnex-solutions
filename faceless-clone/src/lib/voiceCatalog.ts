export type VoiceSeed = {
  id: string;
  name: string;
  descriptor: string;
  gender: "male" | "female";
  accent: string | null;
  language: string;
  providerKey: string;
  providerVoiceId: string;
};

type Row = [id: string, name: string, descriptor: string, gender: "male" | "female", accent: string | null, edgeId: string];

const ROWS: Row[] = [
  ["adam", "Adam", "Confident", "male", null, "en-US-AndrewNeural"],
  ["brittney", "Brittney", "Energetic", "female", null, "en-US-AriaNeural"],
  ["jonah", "Jonah", "Storyteller", "male", null, "en-US-BrianNeural"],
  ["hope", "Hope", "Bright", "female", null, "en-US-JennyNeural"],
  ["jamal", "Jamal", "Chill", "male", null, "en-US-GuyNeural"],
  ["zara", "Zara", "Conversational", "female", null, "en-US-MichelleNeural"],
  ["peter", "Peter", "Confident", "male", null, "en-US-ChristopherNeural"],
  ["jessica", "Jessica", "Conversational", "female", null, "en-US-EmmaNeural"],
  ["james", "James", "Husky", "male", null, "en-US-EricNeural"],
  ["jessa", "Jessa", "Casual", "female", null, "en-US-AvaNeural"],
  ["brian", "Brian", "Deep", "male", null, "en-US-RogerNeural"],
  ["danielle", "Danielle", "Canadian", "female", "Canadian", "en-CA-ClaraNeural"],
  ["michael", "Michael", "Conversational", "male", null, "en-US-SteffanNeural"],
  ["lily", "Lily", "Expressive", "female", null, "en-US-AriaNeural"],
  ["hunter", "Hunter", "Gritty", "male", null, "en-US-AndrewNeural"],
  ["victoria", "Victoria", "Upbeat", "female", null, "en-US-JennyNeural"],
  ["archer", "Archer", "British", "male", "British", "en-GB-RyanNeural"],
  ["veda", "Veda", "Eerie", "female", "British", "en-GB-SoniaNeural"],
  ["ian", "Ian", "Mysterious", "male", "British", "en-GB-ThomasNeural"],
  ["freya", "Freya", "Australian", "female", "Australian", "en-AU-NatashaNeural"],
  ["liam", "Liam", "Warm", "male", null, "en-US-GuyNeural"],
  ["lauren", "Lauren", "Mysterious", "female", "British", "en-GB-LibbyNeural"],
  ["sully", "Sully", "Deep", "male", null, "en-US-RogerNeural"],
  ["riley", "Riley", "Energetic", "female", null, "en-US-MichelleNeural"],
  ["vincent", "Vincent", "Suspenseful", "male", null, "en-US-ChristopherNeural"],
  ["laura", "Laura", "Irish", "female", "Irish", "en-IE-EmilyNeural"],
  ["titan", "Titan", "Powerful", "male", null, "en-US-BrianNeural"],
  ["autumn", "Autumn", "Calm", "female", null, "en-US-EmmaNeural"],
  ["knox", "Knox", "Serious", "male", "British", "en-GB-RyanNeural"],
  ["lorraine", "Lorraine", "Wise", "female", "British", "en-GB-SoniaNeural"],
  ["tom", "Tom", "Australian", "male", "Australian", "en-AU-WilliamNeural"],
  ["misha", "Misha", "Bold", "female", null, "en-US-AvaNeural"],
  ["declan", "Declan", "Eerie", "male", "Irish", "en-IE-ConnorNeural"],
  ["isla", "Isla", "Scottish", "female", "Scottish", "en-GB-LibbyNeural"],
  ["spuds", "Spuds", "Grandpa", "male", null, "en-US-RogerNeural"],
  ["nayva", "Nayva", "Intense", "female", null, "en-US-JennyNeural"],
  ["chuck", "Chuck", "Raspy", "male", null, "en-US-EricNeural"],
  ["empress", "Empress", "Smoky", "female", null, "en-US-MichelleNeural"],
  ["david", "David", "Cinematic", "male", null, "en-US-AndrewNeural"],
  ["mae", "Mae", "Southern", "female", "Southern", "en-US-AriaNeural"],
  ["matt", "Matt", "Casual", "male", null, "en-US-GuyNeural"],
  ["vanessa", "Vanessa", "Soft", "female", null, "en-US-EmmaNeural"],
  ["edwin", "Edwin", "Warm", "male", "Canadian", "en-CA-LiamNeural"],
  ["ravenna", "Ravenna", "Villain", "female", "British", "en-GB-SoniaNeural"],
  ["jedediah", "Jedediah", "Southern", "male", "Southern", "en-US-ChristopherNeural"],
  ["angus", "Angus", "Scottish", "male", "Scottish", "en-GB-ThomasNeural"],
  ["wyatt", "Wyatt", "Cowboy", "male", "Southern", "en-US-EricNeural"],
  ["astro", "Astro", "Smooth", "male", null, "en-US-SteffanNeural"],
  ["alex", "Alex", "Upbeat", "male", null, "en-US-GuyNeural"],
  ["nassim", "Nassim", "Powerful", "male", null, "en-US-AndrewNeural"],
  ["john", "John", "Storyteller", "male", null, "en-US-BrianNeural"],
  ["justin", "Justin", "Clear", "male", null, "en-US-SteffanNeural"],
  ["monika", "Monika", "Indian", "female", "Indian", "en-IN-NeerjaNeural"],
  ["olaniyi", "Olaniyi", "Nigerian", "male", "Nigerian", "en-NG-AbeoNeural"],
  ["thandi", "Thandi", "South African", "female", "South African", "en-ZA-LeahNeural"],
  ["ruhaan", "Ruhaan", "Indian", "male", "Indian", "en-IN-PrabhatNeural"],
  ["tolani", "Tolani", "Nigerian", "female", "Nigerian", "en-NG-EzinneNeural"],
  ["denzel", "Denzel", "Jamaican", "male", "Jamaican", "en-US-ChristopherNeural"],
  ["annakay", "Annakay", "Jamaican", "female", "Jamaican", "en-US-AvaNeural"],
  ["ren", "Ren", "South African", "male", "South African", "en-ZA-LukeNeural"],
];

export const VOICE_CATALOG: VoiceSeed[] = ROWS.map(([id, name, descriptor, gender, accent, providerVoiceId]) => ({
  id,
  name,
  descriptor,
  gender,
  accent,
  language: "en",
  providerKey: "edge",
  providerVoiceId,
}));

export const PREVIEW_SENTENCE = "The door opened, and nobody was standing there.";
