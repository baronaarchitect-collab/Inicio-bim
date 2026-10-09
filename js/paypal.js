// Botón de suscripción de PayPal (mismo botón del "button factory", cargado bajo demanda).
// custom_id = uid de Firebase: así la Cloud Function y el webhook saben a qué usuario activar.

import { CONFIG } from './config.js';

let loading = null;

export function loadPayPal() {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CONFIG.paypal.clientId)}&vault=true&intent=subscription`;
      s.dataset.sdkIntegrationSource = 'button-factory';
      s.onload = () => resolve(window.paypal);
      s.onerror = () => {
        loading = null;
        reject(new Error('No se pudo cargar PayPal. Revisa tu conexión.'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function renderSubscribeButton(container, { uid, onApproved, onCancel, onError }) {
  const paypal = await loadPayPal();
  if (!container.isConnected) return;
  container.innerHTML = '';
  await paypal
    .Buttons({
      style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
      createSubscription: (data, actions) =>
        actions.subscription.create({
          plan_id: CONFIG.paypal.planId,
          custom_id: uid,
          application_context: { brand_name: CONFIG.appName, shipping_preference: 'NO_SHIPPING' }
        }),
      onApprove: (data) => onApproved(data.subscriptionID),
      onCancel,
      onError
    })
    .render(container);
}
