export type FounderPitchRegister = "commercial" | "casual";

export type FounderPitchPracticeAssets = {
  register: FounderPitchRegister;
  title: string;
  subtitle: string;
  audioFull: string;
  manifest: string;
  scriptTxt: string;
  scriptPrint: string;
  downloadScriptName: string;
  downloadMp3Name: string;
  sisterPageHref: string;
  sisterPageLabel: string;
};

export const FOUNDER_PITCH_COMMERCIAL: FounderPitchPracticeAssets = {
  register: "commercial",
  title: "Founder pitch · commercial register",
  subtitle:
    "Sharper catalog language for workflow reviews and buyers who already feel liability pressure.",
  audioFull: "/training-audio/founder-elevator-pitch.mp3",
  manifest: "/training-audio/founder-elevator-pitch-sentences.json",
  scriptTxt: "/training-audio/founder-elevator-pitch-script.txt",
  scriptPrint: "/training-audio/founder-elevator-pitch-script.html",
  downloadScriptName: "ironframe-founder-elevator-pitch-script.txt",
  downloadMp3Name: "ironframe-founder-elevator-pitch.mp3",
  sisterPageHref: "/dashboard/operations/founder-pitch-casual",
  sisterPageLabel: "Casual / peer register →",
};

export const FOUNDER_PITCH_CASUAL: FounderPitchPracticeAssets = {
  register: "casual",
  title: "Founder pitch · casual / peer register",
  subtitle:
    "Same spine, softer words — coffee chats, hallway intros, and rooms where catalog language feels salesy.",
  audioFull: "/training-audio/founder-elevator-pitch-casual.mp3",
  manifest: "/training-audio/founder-elevator-pitch-casual-sentences.json",
  scriptTxt: "/training-audio/founder-elevator-pitch-casual-script.txt",
  scriptPrint: "/training-audio/founder-elevator-pitch-casual-script.html",
  downloadScriptName: "ironframe-founder-elevator-pitch-casual-script.txt",
  downloadMp3Name: "ironframe-founder-elevator-pitch-casual.mp3",
  sisterPageHref: "/dashboard/operations/workflow-review",
  sisterPageLabel: "← Commercial register (LIVE desk)",
};
