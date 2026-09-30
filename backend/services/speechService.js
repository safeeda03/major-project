const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;

const runTranscriber = (audioPath, language) => new Promise((resolve, reject) => {
  const python = process.env.WHISPER_PYTHON || 'python';
  const scriptPath = path.join(__dirname, '..', 'scripts', 'transcribe.py');
  const model = process.env.WHISPER_MODEL || 'small';
  const child = spawn(python, [scriptPath, audioPath, model, language], { windowsHide: true });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => reject(error));
  child.on('close', (code) => {
    if (code !== 0) {
      const error = new Error(stderr.trim() || 'Local speech recognition failed.');
      error.statusCode = 503;
      reject(error);
      return;
    }
    try {
      const result = JSON.parse(stdout);
      if (!result.text?.trim()) throw new Error('No speech was detected.');
      resolve(result.text.trim());
    } catch (error) {
      error.statusCode = 503;
      reject(error);
    }
  });
});

class SpeechService {
  static async transcribe(file, language = 'en-IN') {
    if (!file?.buffer?.length || file.size > MAX_AUDIO_SIZE) {
      const error = new Error('Audio must be present and 15 MB or smaller.');
      error.statusCode = 400;
      throw error;
    }

    const extension = path.extname(file.originalname || '') || '.webm';
    const tempPath = path.join(os.tmpdir(), `poshanai-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`);
    await fs.writeFile(tempPath, file.buffer);
    try {
      return {
        text: await runTranscriber(tempPath, language === 'ml-IN' ? 'ml' : 'en'),
        language,
      };
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }
}

module.exports = SpeechService;
