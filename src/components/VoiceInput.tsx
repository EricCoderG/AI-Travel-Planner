import { useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceInputProps {
  onTranscript: (value: string) => void;
}

const VoiceInput = ({ onTranscript }: VoiceInputProps) => {
  const { supported, listening, transcript, error, start, stop } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  if (!supported) {
    return <p className="hint">当前浏览器暂不支持 Web Speech API，可手动输入。</p>;
  }

  return (
    <div className="voice-input">
      <button type="button" className="primary" onClick={listening ? stop : start}>
        {listening ? '停止录音' : '语音填写需求'}
      </button>
      {error && <p className="error">语音识别失败：{error}</p>}
      {transcript && <p className="hint">识别结果：{transcript}</p>}
    </div>
  );
};

export default VoiceInput;
