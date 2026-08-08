import axios from 'axios';

const CONFIG = {
  GEMINI: {
    MODEL: 'gemini-3.6-flash',
    URL: 'https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models',
    HEADERS: {
      'Content-Type': 'application/json',
      'x-goog-api-key': 'AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
      'x-goog-api-client': 'gl-kotlin/2.2.21-ai fire/17.7.0',
      'x-firebase-appid': '1:652803432695:android:c4341db6033e62814f33f2',
      'x-firebase-appversion': '128'
    }
  },
  IMAGEN: {
    URL: 'https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models/imagen-4.0-fast-generate-001:predict',
    HEADERS: {
      'Content-Type': 'application/json',
      'x-goog-api-key': 'AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
      'x-goog-api-client': 'gl-kotlin/2.2.21-ai fire/17.7.0',
      'x-firebase-appid': '1:652803432695:android:c4341db6033e62814f33f2',
      'x-firebase-appversion': '128'
    }
  },
  BYPASS: {
    MAX_RETRIES: 3,
    AUTO_ROTATE_EVERY: 5
  }
};

const SYSTEM_INSTRUCTION = {
  role: 'user',
  parts: [{
    text: 'You are a helpful assistant. Keep your answers concise.'
  }]
};

let currentIdToken: string | null = null;
let requestCount = 0;

async function signupNewToken(): Promise<string> {
  const { data } = await axios.post(
    'https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
    { clientType: 'CLIENT_TYPE_ANDROID' },
    {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 12; SM-S9280 Build/AP3A.240905.015.A2)',
        'Content-Type': 'application/json',
        'X-Android-Package': 'com.jetkite.gemmy',
        'X-Android-Cert': '037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2',
        'X-Firebase-GMPID': '1:652803432695:android:c4341db6033e62814f33f2'
      }
    }
  );
  currentIdToken = data.idToken;
  return currentIdToken as string;
}

function isRateLimitError(error: any): boolean {
  const status = error.response?.status;
  const msg = (error.response?.data?.error?.message || error.message || '').toLowerCase();
  return (
    status === 429 ||
    msg.includes('quota') ||
    msg.includes('rate') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests') ||
    msg.includes('limit')
  );
}

async function requestWithBypass(url: string, data: any, headers: any, timeout = 30000): Promise<any> {
  const maxRetries = CONFIG.BYPASS.MAX_RETRIES;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      requestCount++;
      if (requestCount >= CONFIG.BYPASS.AUTO_ROTATE_EVERY && currentIdToken) {
        await signupNewToken();
      }

      const reqHeaders = { ...headers };
      if (currentIdToken) {
        reqHeaders['x-firebase-auth-token'] = currentIdToken;
      }

      return await axios.post(url, data, { headers: reqHeaders, timeout });
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error) && attempt < maxRetries - 1) {
        await signupNewToken();
        requestCount = 0;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export const gemmy = {
  rotateToken: async () => {
    const token = await signupNewToken();
    requestCount = 0;
    return { success: true, tokenPrefix: token.substring(0, 10) + '...' };
  },

  chat: async (prompt: string, history: any[] = [], media: any = null, modelName: string | null = null, options: any = {}) => {
    try {
      const model = modelName || CONFIG.GEMINI.MODEL;
      let parts: any[] = [];

      parts.push({ text: prompt });

      const generationConfig: any = {
        maxOutputTokens: options.maxOutputTokens || 4000,
        temperature: options.temperature ?? 2.0
      };
      if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;

      const { data } = await requestWithBypass(
        `${CONFIG.GEMINI.URL}/${model}:generateContent`,
        {
          contents: [...history, { role: 'user', parts }],
          systemInstruction: options.systemInstruction || SYSTEM_INSTRUCTION,
          generationConfig
        },
        CONFIG.GEMINI.HEADERS,
        options.timeout || 30000
      );

      if (data.candidates?.[0]?.content) {
        const reply = data.candidates[0].content;
        return {
          success: true,
          reply: reply.parts[0].text,
          model,
          history: [...history, { role: 'user', parts }, reply],
          usage: data.usageMetadata,
          tokenRotated: !!currentIdToken
        };
      }
      return { success: false, msg: 'No response', raw: data };
    } catch (error: any) {
      return { success: false, msg: error.response?.data?.error?.message || error.message, tokenRotated: !!currentIdToken };
    }
  }
};
