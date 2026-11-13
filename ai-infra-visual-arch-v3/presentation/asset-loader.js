let ready;
export function loadAssets(){return ready??=Promise.all(['scale-model','visual-system'].map(name=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/assets/'+name+'.js';script.onload=resolve;script.onerror=reject;document.head.append(script)})))}
