export const getExternalApiConfig = () => ({
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
  },
  googleTts: {
    apiKey: process.env.GOOGLE_TTS_KEY || '',
  },
});
