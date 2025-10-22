/**
 * webllm.worker.ts
 * - Web Worker module that imports WebLLM (from CDN when bundled, or via package when using Vite).
 * - This worker handles engine init, progress reporting, and inference.
 *
 * Notes for beginners:
 * - We keep heavy work inside this worker so the main UI thread remains responsive on mobile.
 * - The exact WebLLM API may change across versions. We try common patterns and log available keys.
 */

const CDN = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/lib/index.js';

let engine: any = null;
let appConfig: any = null;

function postLog(text: string){
  postMessage({ type:'log', text });
}
function postProgress(p: number){
  postMessage({ type:'progress', progress: p });
}
function postWebgpu(s: string){
  postMessage({ type:'webgpu', status: s });
}
function postChunk(c: string){
  postMessage({ type:'response_chunk', chunk: c });
}
function postFinal(t: string){
  postMessage({ type:'response_final', text: t });
}

// Check WebGPU availability (basic)
async function checkWebGPU(){
  try {
    const ok = !!(self as any).navigator?.gpu;
    postWebgpu(ok ? 'WebGPU available' : 'WebGPU not available, will fallback to WASM');
    return ok;
  } catch(e){
    postWebgpu('WebGPU check error');
    return false;
  }
}

self.addEventListener('message', async (ev) => {
  const d = ev.data;
  if(d.type === 'init'){
    postLog('Worker init started');
    postProgress(0.02);
    const webgpu = await checkWebGPU();

    try{
      // Dynamic import from CDN in worker context may be blocked by CORS.
      // If you encounter CORS issues, switch to npm + vite and use `import { CreateMLCEngine } from '@mlc-ai/web-llm'`.
      const webllm = await import(CDN);
      postLog('WebLLM module loaded from CDN');
      postProgress(0.05);

      const { CreateMLCEngine, prebuiltAppConfig, version } = webllm as any;
      postLog('webllm.version: ' + (version || 'unknown'));
      appConfig = prebuiltAppConfig || {};
      appConfig.useIndexedDBCache = true;

      const model_list = appConfig.model_list || [];
      const selected = model_list.length ? (model_list[0].model_id || model_list[0].model) : null;
      if(!selected){
        postLog('No prebuilt model found in prebuiltAppConfig. Please register a model in appConfig.');
        postProgress(1);
        return;
      }

      postLog('Selected model: ' + selected);
      engine = await CreateMLCEngine(selected, {
        appConfig,
        initProgressCallback: (s: any) => {
          postProgress(s.progress ?? 0);
          if(s.message) postLog('init: ' + s.message);
        }
      });

      postLog('Engine initialized');
      postProgress(1);
      postMessage({ type:'ready' });
    } catch(e){
      postLog('Failed to load or init WebLLM: ' + String(e));
      postProgress(1);
      postMessage({ type:'ready' });
    }
  } else if(d.type === 'prompt'){
    const prompt = d.prompt;
    postLog('Received prompt (length ' + String(prompt.length) + ')');

    if(!engine){
      postLog('Engine not ready, attempting init again');
      await (self as any).postMessage({ type:'log', text:'Engine not ready' });
      return;
    }

    try{
      // Try common API names for chat - adjust after checking engine object
      if(typeof engine.createChatCompletion === 'function'){
        const stream = await engine.createChatCompletion({
          messages: [{ role:'user', content: prompt }]
        });
        if(stream?.text) postFinal(stream.text);
        return;
      }

      if(typeof engine.request === 'function'){
        const res = await engine.request({ messages:[{role:'user', content: prompt}] });
        postFinal(res?.text || JSON.stringify(res));
        return;
      }

      // Unknown API: dump engine keys for debugging (main thread will show logs)
      postLog('Unknown engine API. Keys: ' + Object.keys(engine || {}).join(', '));
      postFinal('Unknown engine API - check console for keys.');
    } catch(err){
      postLog('Inference error: ' + String(err));
      postFinal('Inference error: ' + String(err));
    }
  } else if(d.type === 'clearCache'){
    // optional: if engine supports clearing cache
    try{
      if(engine?.clearCache) await engine.clearCache();
      postLog('Cleared engine cache (if supported)');
    } catch(e){
      postLog('clearCache failed: '+e);
    }
  }
});
