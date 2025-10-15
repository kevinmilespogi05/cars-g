import { create } from 'zustand';

interface ImageViewerState {
  isImageViewerOpen: boolean;
  setIsImageViewerOpen: (isOpen: boolean) => void;
}

export const useImageViewerStore = create<ImageViewerState>((set) => ({
  isImageViewerOpen: false,
  setIsImageViewerOpen: (isOpen: boolean) => set({ isImageViewerOpen: isOpen }),
}));
