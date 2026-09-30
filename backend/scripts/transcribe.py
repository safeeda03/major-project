import json
import sys

from faster_whisper import WhisperModel


def main():
    if len(sys.argv) < 4:
        raise ValueError("Usage: transcribe.py AUDIO_PATH MODEL LANGUAGE")

    audio_path, model_name, language = sys.argv[1:4]
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio_path, language=language, beam_size=5, vad_filter=True)
    text = " ".join(segment.text.strip() for segment in segments).strip()
    print(json.dumps({"text": text}, ensure_ascii=False))


if __name__ == "__main__":
    main()
