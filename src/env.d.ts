/// <reference path="../.astro/types.d.ts" />

declare global {
  interface Window {
    __nanostores_player: any;
    playerPlay: (payload: any) => void;
    appNavigate: (href: string) => void;
    __playerNowPlaying: any;
  }
}