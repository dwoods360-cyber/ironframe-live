import { create } from "zustand";

type GetStartedReaderState = {
  inlineDocHref: string | null;
  setInlineDocHref: (href: string | null) => void;
  clearInlineDoc: () => void;
};

export const useGetStartedReaderStore = create<GetStartedReaderState>((set) => ({
  inlineDocHref: null,
  setInlineDocHref: (href) => set({ inlineDocHref: href }),
  clearInlineDoc: () => set({ inlineDocHref: null }),
}));
