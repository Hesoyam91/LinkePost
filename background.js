function inferPostProfile(promptInput) {
  const text = promptInput.toLowerCase();

  const emotionalSignals = /(dolor|frustr|miedo|incertidumbre|vulner|duro|aprend|cierre|fin|decisión|desaf|ansiedad|lucha|camino|tensión|honest|difícil|arriesgado)/.test(text);
  const commercialSignals = /(cliente|ventas|mercado|producto|marca|brand|growth|resultado|negocio|estrategia|salario|mejora|modelo|ROI|pitch|business)/.test(text);
  const networkingSignals = /(conectar|red|network|colabor|equipo|mentores|aprender|conoc|personas)/.test(text);

  let type = 'general';
  let tone = 'auténtico y profesional';
  let objective = 'transformar una idea breve en una reflexión con valor para profesionales';
  let style = 'Genera un post útil, directo y conversacional, con una estructura clara y una pregunta final que invite a comentar.';
  let angle = 'equilibrado';
  let profile = 'general';
  let audience = 'profesionales en general';
  let vulnerability = emotionalSignals ? 'alta' : 'media';
  let ctaStrength = 'media';

  if (/renunci|salir|dejo|aband|cambi|nueva etapa|carrera|trabajo/.test(text)) {
    type = 'cambio de carrera';
    tone = 'reflexivo y valiente';
    objective = 'mostrar una transición profesional con autenticidad, decisión y aprendizaje';
    style = 'Enfócate en el proceso, la decisión y la evolución. Hazlo sentir honesto y aspiracional, sin sonar a discurso corporativo.';
    angle = emotionalSignals ? 'emocional' : 'sincero';
    profile = 'career transition';
    audience = 'profesionales buscando reinicio o cambio de rumbo';
    vulnerability = 'alta';
    ctaStrength = 'media-alta';
  } else if (/emprend|startup|proyecto|crear|negocio|abrir|lanzar|empresa/.test(text)) {
    type = 'emprendimiento';
    tone = 'audaz y realista';
    objective = 'destacar el riesgo, la construcción y la visión del proyecto';
    style = 'Resalta la incertidumbre, la acción y los aprendizajes del camino. Mantén un tono de construcción, no de promoción vacía.';
    angle = commercialSignals ? 'comercial con base real' : 'construcción y visión';
    profile = 'founder / builder';
    audience = 'founders, builders y profesionales del ecosistema emprendedor';
    vulnerability = 'media';
    ctaStrength = 'media';
  } else if (/logro|meta|objetivo|gan|premio|alcance|resultado|metric|éxito/.test(text)) {
    type = 'logro';
    tone = 'confidente y humilde';
    objective = 'celebrar un resultado sin perder la credibilidad';
    style = 'Equilibra el éxito con la humildad. Muestra lo que se logró y lo que aprendiste en el camino.';
    angle = commercialSignals ? 'comercial' : 'celebratorio';
    profile = 'productividad / resultados';
    audience = 'profesionales interesados en progreso y ejecución';
    vulnerability = 'baja';
    ctaStrength = 'media';
  } else if (/aprend|curso|estudi|capacit|certific|formaci|mentor|investig/.test(text)) {
    type = 'aprendizaje';
    tone = 'humilde y curioso';
    objective = 'expresar crecimiento y reflexión intelectual';
    style = 'Haz foco en la curiosidad, el proceso de aprendizaje y la aplicación práctica del conocimiento.';
    angle = 'educativo';
    profile = 'aprendizaje continuo';
    audience = 'profesionales en crecimiento y aprendizaje continuo';
    vulnerability = 'media';
    ctaStrength = 'media';
  } else if (/salida|dejar|retir|cierro|abandono|termin|fin de etapa/.test(text)) {
    type = 'salida de trabajo';
    tone = 'introspectivo y emocional';
    objective = 'expresar cierre, gratitud y nueva dirección';
    style = 'Escribe con sinceridad, agradecimiento y claridad sobre lo que termina y lo que viene.';
    angle = 'emocional';
    profile = 'transición personal';
    audience = 'redes profesionales y personas en transición';
    vulnerability = 'alta';
    ctaStrength = 'alta';
  }

  if (networkingSignals && !commercialSignals && !emotionalSignals) {
    audience = 'profesionales y personas enfocadas en networking y colaboración';
    ctaStrength = 'media-alta';
  }

  const angleFinal = commercialSignals && emotionalSignals ? 'equilibrado (emocional + comercial)' : commercialSignals ? 'comercial' : emotionalSignals ? 'emocional' : angle;

  return {
    type,
    tone,
    objective,
    style,
    angle: angleFinal,
    profile,
    audience,
    vulnerability,
    ctaStrength
  };
}

const PUBLIC_BACKEND_URL = 'https://linkepost-api.example.com/generate';

async function generatePostWithBackend(promptInput) {
  const response = await fetch(PUBLIC_BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptInput })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `El backend respondió con ${response.status}`);
  }

  if (data.text) return data.text;
  throw new Error('Respuesta inesperada del backend público');
}

async function generatePostWithGemini(apiKey, promptInput, selectedModel) {
  // Modelo por defecto fijado en gemini-3.6-flash
  const MODEL_NAME = selectedModel || 'gemini-3.6-flash'; 
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  const profile = inferPostProfile(promptInput);

  const systemPrompt = `
Eres el motor central de LinkePost, una extensión para LinkedIn que transforma ideas breves en publicaciones profesionales, humanas y de alto impacto.

Tu objetivo es convertir cualquier input del usuario en un post de LinkedIn que se sienta genuino, claro y atractivo, sin sonar artificial ni forzado.

Perfil detectado del usuario:
- Tipo: ${profile.type}
- Tono sugerido: ${profile.tone}
- Objetivo: ${profile.objective}
- Estilo recomendado: ${profile.style}
- Ángulo principal: ${profile.angle}
- Perfil profesional estimado: ${profile.profile}
- Audiencia objetivo: ${profile.audience}
- Nivel de vulnerabilidad: ${profile.vulnerability}
- Intensidad del CTA: ${profile.ctaStrength}

Reglas estrictas:
1. Salida final obligatoria:
   - Devuelve únicamente el texto final de la publicación de LinkedIn.
   - No agregues ninguna introducción, prefacio, explicación, encabezado, título, ni texto tipo: "Aquí va el post", "Claro, aquí tienes", "Este es el mensaje que me pediste".
   - No incluyas comentarios sobre tu proceso ni sobre el prompt.
   - La respuesta debe comenzar directamente con la primera línea del post.

2. Estructura obligatoria:
   - Gancho (Hook): una primera línea potente que rompa el scroll y genere curiosidad, empatía o reflexión.
   - Cuerpo: varios párrafos cortos (máximo 2-3 líneas cada uno), con contenido concreto, aprendizaje, decisión, vulnerabilidad o evolución profesional.
   - Cierre / CTA: una pregunta o reflexión final que invite a la interacción en la caja de comentarios de LinkedIn.

3. Tono y estilo:
   - Profesional, cercano, genuino y honesto.
   - Redacción clara y directa.
   - Lectura rápida, con saltos de línea naturales.
   - Sin lenguaje pomposo, excesivamente técnico ni superficial.
   - Máximo 1 o 2 emojis en todo el texto, solo si aportan valor real.
   - Ajusta la energía del texto según el tipo detectado:
     * cambio de carrera → más emocional y reflexivo
     * emprendimiento → más realista y en construcción
     * logro → más humilde y celebratorio
     * aprendizaje → más curioso y profundo
     * salida de trabajo → más emocional y agradecido
   - Si el perfil profesional es founder / builder, usa un lenguaje más estratégico, práctico y orientado a construcción.
   - Si el perfil es career transition, prioriza la narrativa personal y la claridad de decisión.
   - Si el perfil es aprendizaje continuo, dale más tono de exploración, análisis y crecimiento.
   - Si el ángulo es comercial, usa un enfoque más útil y estratégico; si es emocional, prioriza la vulnerabilidad y la narrativa personal; si es equilibrado, mezcla ambas con naturalidad.
   - Si el nivel de vulnerabilidad es alto, habla con más sinceridad y más detalles de experiencia; si es bajo, sé más directo y escueto.
   - Si la intensidad del CTA es alta, la pregunta final debe invitar más fuerte a comentarios y conversación; si es media o baja, hazla más sutil y reflexiva.

4. Contenido:
   - Adaptar el texto al contexto del usuario y al perfil detectado.
   - Si el usuario comparte un hito, convertirlo en una historia con sentido, no solo en un anuncio.
   - Mezclar valor práctico, lección aprendida y experiencia real.
   - No inventes datos que no existan. Debes basarte únicamente en la idea suministrada por el usuario.
   - Evita frases genéricas del tipo "hoy quiero compartir..." o "me siento muy feliz" si no aportan valor.
   - Si el perfil es de producto/negocio, el texto debe sonar más estratégico y orientado a resultados; si es personal, debe sonar más humano y auténtico.

5. Formato de salida:
   - Debe verse como una publicación real de LinkedIn, no como un resumen técnico ni un texto de marketing genérico.
   - Usa párrafos breves y una conclusión con pregunta o reflexión final.
   - Evita hashtags si no son necesarios. Si los usas, máximo 3 y muy relevantes.
   - Ningún texto extra fuera de la publicación.
   - Evita listas largas o demasiado estructuradas si no aportan valor narrativo.
   - No uses frases de cierre como "Gracias por leer", "Espero que les sirva", "Si te interesa", ni similares.

6. Calidad del contenido:
   - Debe ser dinámica, auténtica, útil y de alto engagement.
   - El texto debe invitar a la conversación y resonar con profesionales que buscan crecimiento, aprendizaje o cambio.
   - La publicación debe sentirse humana, no fabricada.

Ejemplos de referencia:
- Founder / builder: "La mejor forma de aprender un negocio no es teorizarlo durante meses; es construir, medir, ajustar y seguir." 
- Career transition: "Tomar una decisión arriesgada nunca es fácil, pero seguir en la zona de confort cuesta más caro a largo plazo."
- Aprendizaje continuo: "La mejor forma de crecer no es tener todas las respuestas, sino hacer la pregunta correcta y empezar a construir."
- Logro: "Los resultados importantes no llegan por suerte; llegan por consistencia, aprendizaje y decisión."

Ahora genera una publicación basada en el siguiente input del usuario:
${promptInput}
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\nDatos de entrada del usuario: ${promptInput}` }]
      }]
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Error en la API de Gemini');
  }

  if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Respuesta inesperada de la API de Gemini');
  }
}

// Escuchador de mensajes desde content.js
const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

runtimeAPI.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GENERATE_POST') {
    generatePostWithBackend(request.promptInput)
      .then(generatedText => sendResponse({ success: true, text: generatedText }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Asíncrono
  }
});

console.log('🚀 [Background Script]: Registrado y listo para recibir mensajes.');