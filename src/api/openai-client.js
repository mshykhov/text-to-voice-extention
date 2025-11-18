import { DEFAULT_MODEL } from '../config/constants.js';

export async function generateAudio(text, settings, signal = null) {
  const { apiKey, voice, speed } = settings;

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: text,
      voice,
      speed,
      response_format: 'mp3'
    })
  };

  if (signal) {
    fetchOptions.signal = signal;
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', fetchOptions);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${error}`);
  }

  return await response.arrayBuffer();
}
