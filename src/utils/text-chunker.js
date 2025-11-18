export function chunkTextBySentences(text, sentencesPerChunk = 3) {
  const chunks = [];
  const positions = [];

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentChunk = '';
  let sentenceCount = 0;
  let position = 0;

  for (const sentence of sentences) {
    if (sentenceCount === 0) {
      position = text.indexOf(sentence, position);
    }

    currentChunk += sentence;
    sentenceCount++;

    if (sentenceCount >= sentencesPerChunk) {
      const trimmed = currentChunk.trim();
      chunks.push(trimmed);
      positions.push({
        start: position,
        end: position + currentChunk.length
      });
      position += currentChunk.length;
      currentChunk = '';
      sentenceCount = 0;
    }
  }

  if (currentChunk.trim()) {
    const trimmed = currentChunk.trim();
    chunks.push(trimmed);
    positions.push({
      start: position,
      end: position + currentChunk.length
    });
  }

  if (chunks.length === 0) {
    return { chunks: [text], positions: [{ start: 0, end: text.length }] };
  }

  return { chunks, positions };
}
