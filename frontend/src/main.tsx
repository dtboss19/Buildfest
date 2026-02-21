import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// #region agent log
const _t0 = Date.now();
fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:entry',message:'script entry',data:{t0:_t0},timestamp:_t0,hypothesisId:'H4'})}).catch(()=>{});
// #endregion
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
// #region agent log
fetch('http://127.0.0.1:7245/ingest/71b4a864-7d3e-4999-93a3-797a1b84b4b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:after-render',message:'createRoot.render done',data:{elapsed:Date.now()-_t0},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
// #endregion
