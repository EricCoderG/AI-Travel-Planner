import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionWithStop extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionWithStop;
    };
    SpeechRecognition?: {
      new (): SpeechRecognitionWithStop;
    };
  }
}

export const useSpeechRecognition = () => {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionWithStop | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const instance = new SpeechRecognition();
    instance.lang = 'zh-CN';
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = (event: any) => {
      const [result] = event.results[event.results.length - 1];
      setTranscript(result.transcript);
    };
    instance.onerror = (event: any) => {
      setError(event.error);
      setListening(false);
    };
    instance.onend = () => {
      setListening(false);
    };
    recognitionRef.current = instance;
    setSupported(true);
    return () => {
      instance.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError('当前浏览器不支持语音识别');
      return;
    }
    setTranscript('');
    setError(undefined);
    setListening(true);
    recognitionRef.current.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, transcript, error, start, stop };
};
