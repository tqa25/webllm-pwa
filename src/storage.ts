/**
 * storage.ts
 * Simple helper to save chat history and settings to localStorage.
 * For larger or binary data (model weights), rely on WebLLM's IndexedDB support.
 */

export function saveHistory(key: string, data: any){
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e){
    console.warn('saveHistory failed', e);
  }
}

export function loadHistory(key: string){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch(e){
    console.warn('loadHistory failed', e);
    return null;
  }
}
