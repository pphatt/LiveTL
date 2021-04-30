import { doSpeechSynth, speechVolume } from './store.js';

export function speak(text, volume=null) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = volume || speechVolume.get() || 1;
  speechSynthesis.speak(utterance);
};

export function checkAndSpeak(text) {
  if (doSpeechSynth.get()) {
    speak(text);
  }
}

setTimeout(() => {
  let isInitial = true;
  doSpeechSynth.subscribe($doSpeechSynth => {
    if (isInitial || !$doSpeechSynth) {
      isInitial = false;
      return;
    }
    speak('Speech synthesis enabled');
  });
}, 0);